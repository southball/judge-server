import {Transform, Type} from 'class-transformer';
import {IsArray, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, Max, Min} from 'class-validator';
import {NextFunction, Request, Response, Router} from 'express';
import {AppState} from '../app-state';
import {authAdminMiddleware, userIsAdmin} from '../auth';
import {Err, Ok} from '../json';
import {Contest, Problem, RichSubmission, Submission, toPublicSubmission, toSlimSubmission} from '../models';
import {bodySingleTransformerMiddleware, querySingleTransformerMiddleware} from '../validation';

export function submissionsRouter(): Router {
    const router = Router();

    router.param('submission_id', fetchSubmission);

    router.get('/submissions',
        querySingleTransformerMiddleware(GetSubmissionsProps),
        getSubmissions);

    router.get('/submission/:submission_id', getSubmission);
    router.put('/submission/:submission_id/judge',
        authAdminMiddleware,
        bodySingleTransformerMiddleware(UpdateSubmissionJudgeProps),
        updateSubmissionJudge);
    router.post('/submission/:submission_id/rejudge', authAdminMiddleware, rejudgeSubmission);

    return router;
}

/**
 * Set `req.submission` to the submission with `id` equal to `submission_id` if found, and errs otherwise.
 */
async function fetchSubmission(req: Request, res: Response, next: NextFunction, submission_id: string): Promise<void> {
    const {pool} = AppState.get();

    const result = await pool.query(
            `SELECT *
             FROM Submissions
             WHERE id = $1`,
        [submission_id],
    );

    if (result.rowCount === 0) {
        res.json(Err('Submission not found!'));
        return;
    }

    const submission = result.rows[0] as Submission;

    req.submission = submission;

    // Create the RichSubmission object.
    {
        const result = await pool.query(
                `SELECT U.username,
                        P.slug  AS problem_slug,
                        P.title AS problem_title,
                        C.slug  AS contest_slug,
                        C.title AS contest_title,
                        CP.slug AS contest_problem_slug
                 FROM Submissions S
                          JOIN Problems P on S.problem_id = P.id
                          JOIN Users U on S.user_id = U.id
                          LEFT JOIN Contests C on S.contest_id = C.id
                          LEFT JOIN ContestProblems CP on S.contest_problem_id = CP.id
                 WHERE S.id = $1`,
            [submission.id],
        );

        const row = result.rows[0];

        const rawVerdict = JSON.parse(submission.verdict_json ?? '{}');
        const testcases = rawVerdict?.testcases ?? null;

        req.richSubmission = {
            ...req.submission,
            username: row.username,
            problem_slug: row.problem_slug,
            problem_title: row.problem_title,
            contest_slug: row.contest_slug,
            contest_title: row.contest_title,
            contest_problem_slug: row.contest_problem_slug,
            testcases,
        };
    }

    if (!userIsAdmin(req.user) && submission.user_id !== req.user?.id) {
        // Check whether user can access the submission
        let accessible: boolean = false;

        // If the submission is from a contest, the contest must be considered first.
        if (submission.contest_id !== null) {
            const result = await pool.query(
                    `SELECT *
                     FROM Contests
                     WHERE id = $1`,
                [submission.contest_id],
            );
            const contest = result.rows[0] as Contest;
            const now = new Date();

            if (now > contest.end_time) {
                if (contest.is_public) {
                    accessible = true;
                }

                const result = await pool.query(
                        `SELECT *
                         FROM ContestRegistrations
                         WHERE contest_id = $1
                           AND user_id = $2`,
                    [submission.contest_id, submission.user_id],
                );

                if (result.rowCount === 1) {
                    accessible = true;
                }
            }
        } else {
            // Consider whether the user can already access the problem.
            const result = await pool.query(
                    `SELECT *
                     FROM Problems
                     WHERE id = $1`,
                [submission.problem_id],
            );

            const problem: Problem = result.rows[0];

            if (problem.is_public) {
                accessible = true;
            }
        }

        if (!accessible) {
            res.json(Err('Submission not found!'));
            return;
        }
    }

    next();
}

class GetSubmissionsProps {
    @IsOptional() @IsNumber() @Transform(parseInt) start: number;
    @IsNumber() @Min(1) @Max(100) @Transform(parseInt) count: number = 10;
}

async function getSubmissions(req: Request, res: Response): Promise<void> {
    const body = req.queryBody as GetSubmissionsProps;
    const {pool} = AppState.get();

    console.log(body);

    const result = await pool.query(
            `SELECT S.*,
                    U.username,
                    P.slug  AS problem_slug,
                    P.title AS problem_title,
                    C.slug  AS contest_slug,
                    C.title AS contest_title,
                    CP.slug AS contest_problem_slug
             FROM Submissions S
                      JOIN Problems P on S.problem_id = P.id
                      JOIN Users U on S.user_id = U.id
                      LEFT JOIN Contests C on S.contest_id = C.id
                      LEFT JOIN ContestProblems CP on S.contest_problem_id = CP.id
             WHERE ($2 OR S.id <= $3)
             ORDER BY S.id DESC
             LIMIT $1`,
        [
            body.count,
            typeof body.start !== 'number',
            body.start,
        ],
    );

    const submissions = (result.rows as RichSubmission[]).map(toSlimSubmission);

    res.json(Ok(submissions));
}

async function getSubmission(req: Request, res: Response): Promise<void> {
    if (userIsAdmin(req.user)) {
        res.json(Ok(req.richSubmission));
    } else {
        res.json(Ok(toPublicSubmission(req.richSubmission)));
    }
}

class JudgeTestcaseOutput {
    @IsNotEmpty() verdict: string;
    @IsNumber() time: number;
    @IsNumber() memory: number;
    @IsString() checker_output: string;
    @IsString() sandbox_output: string;
}

class UpdateSubmissionJudgeProps {
    @IsNotEmpty() verdict: string;
    @IsNumber() time: number;
    @IsNumber() memory: number;
    @IsString() compile_message: string;
    @IsArray() @Type(() => JudgeTestcaseOutput) testcases: JudgeTestcaseOutput[];
}

async function updateSubmissionJudge(req: Request, res: Response): Promise<void> {
    const {pool, io} = AppState.get();
    const body = req.body as UpdateSubmissionJudgeProps;

    try {
        await pool.query(
                `UPDATE Submissions
                 SET verdict=$1,
                     time=$2,
                     memory=$3,
                     verdict_json=$4,
                     compile_message=$5
                 WHERE id = $6`,
            [
                body.verdict,
                body.time,
                body.memory,
                JSON.stringify(body),
                body.compile_message,
                req.submission.id,
            ],
        );

        res.json(Ok());

        try {
            const progress = body.testcases.filter((testcase) => testcase.verdict !== 'WJ').length;
            const total = body.testcases.length;
            const eventName = `submission.${req.submission.id}`;
            const {time, memory} = body;

            io.emit(eventName, {progress, total, time, memory});
        } catch (err) {
            console.error(err);
        }
    } catch (err) {
        res.json(Err('Failed to update submission.'));
    }
}

async function rejudgeSubmission(req: Request, res: Response): Promise<void> {
    const {pool, queue} = AppState.get();

    try {
        // Clean problem verdict
        await pool.query(
                `UPDATE Submissions
                 SET verdict_json='{}',
                     verdict='WJ',
                     time=NULL,
                     memory=NULL
                 WHERE id = $1`,
            [req.submission.id],
        );

        // Push submission ID to queue.
        const channel = await queue.createChannel();
        await channel.assertQueue('JUDGE_QUEUE');
        await channel.sendToQueue('JUDGE_QUEUE', Buffer.from(req.submission.id.toString()));

        // Delegate error handling.
        fetchSubmission(req, res, () => {
            getSubmission(req, res);
        }, req.params.submission_id);
    } catch (err) {
        console.error(err);
        res.json(Err('Failed to rejudge submission.'));
    }
}

export default submissionsRouter;
