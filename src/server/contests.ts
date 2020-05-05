import {Type, Transform} from 'class-transformer';
import {IsBoolean, IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested} from 'class-validator';
import {NextFunction, Request, Response, Router} from 'express';
import {PoolClient} from 'pg';
import {AppState} from '../app-state';
import {authAdminMiddleware, authUserMiddleware, userIsAdmin} from '../auth';
import {Err, Ok} from '../json';
import {
    Contest,
    ContestProblem,
    ContestProblemInfo,
    Problem,
    PublicContest,
    RichSubmission,
    Submission,
    toPublicContest,
    toPublicContestProblemInfo, toPublicProblem,
    User,
} from '../models';
import {bodySingleTransformerMiddleware} from '../validation';

export function contestsRouter(): Router {
    const router = Router();

    router.get('/contests', getContests);
    router.post('/contests',
        authAdminMiddleware,
        bodySingleTransformerMiddleware(CreateContestProps),
        createContest);

    router.param('contest_slug', fetchContestFromSlug);
    router.param('contest_problem_slug', fetchContestProblemFromSlug);

    router.get('/contest/:contest_slug/registrants', getContestRegistrants)

    router.get('/contest/:contest_slug', getContest);
    router.put('/contest/:contest_slug',
        authAdminMiddleware,
        bodySingleTransformerMiddleware(EditContestProps),
        editContest);
    router.delete('/contest/:contest_slug',
        authAdminMiddleware,
        deleteContest);

    router.get('/contest/:contest_slug/problem/:contest_problem_slug',
        getContestProblem);
    router.post('/contest/:contest_slug/problem/:contest_problem_slug/submit',
        authUserMiddleware,
        userContestRunningMiddleware,
        bodySingleTransformerMiddleware(SubmitToContestProps),
        submitToContest);
    router.get('/contest/:contest_slug/submissions', getContestSubmissions);

    return router;
}

async function userContestRunningMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const {pool} = AppState.get();
    const {contest, user} = req;

    const now = new Date();
    if (contest.start_time > now) {
        res.json(Err('The contest has not yet started.'));
        return;
    }
    if (contest.end_time < now) {
        res.json(Err('The contest has already ended.'));
        return;
    }

    // Check that the user has already solved the problem.
    const result = await pool.query(
            `SELECT *
             FROM ContestRegistrations
             WHERE contest_id = $1
               AND user_id = $2`,
        [contest.id, user.id],
    );

    if (result.rowCount !== 1) {
        res.json(Err('You have not yet joined the contest.'));
        return;
    }

    next();
}

/**
 * Set `req.contest` to the contest with `id` equal to `contest_slug` and `req.contestProlems` to corresponding
 * problems if found, and errs otherwise.
 */
async function fetchContestFromSlug(req: Request, res: Response, next: NextFunction, contest_slug: string): Promise<void> {
    const {pool} = AppState.get();

    // Fetch contest
    {
        const result = await pool.query(
                `SELECT *
                 FROM Contests
                 WHERE slug = $1`,
            [contest_slug],
        );

        if (result.rowCount === 0) {
            res.json(Err('Contest not found.'));
            return;
        }

        const contest = result.rows[0] as Contest;

        if (contest.is_public !== true && !userIsAdmin(req.user)) {
            res.json(Err('Contest not found.'));
            return;
        }

        req.contest = contest;
    }

    // Fetch contest problems
    {
        const {contest} = req;
        const result = await pool.query(
                `SELECT *
                 FROM ContestProblems
                 WHERE contest_id = $1`,
            [contest.id],
        );

        const contestProblems = result.rows as ContestProblem[];
        req.contestProblems = contestProblems;
    }

    next();
}

async function fetchContestProblemFromSlug(req: Request, res: Response, next: NextFunction, contest_problem_slug: string): Promise<void> {
    const {pool} = AppState.get();

    const contestProblemResult = await pool.query(
            `SELECT *
             FROM ContestProblems
             WHERE slug = $1`,
        [contest_problem_slug],
    );

    if (contestProblemResult.rowCount === 0) {
        res.json(Err('Contest problem not found.'));
        return;
    }

    const contestProblem = contestProblemResult.rows[0] as ContestProblem;
    req.contestProblem = contestProblem;

    const problemResult = await pool.query(
            `SELECT *
             FROM Problems
             WHERE id = $1`,
        [contestProblem.problem_id],
    );

    const problem = problemResult.rows[0] as Problem;
    req.problem = problem;

    next();
}

async function getContests(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();

    try {
        const result = await pool.query(`SELECT *
                                         FROM Contests
                                         ORDER BY start_time DESC`);
        const contests = result.rows as Contest[];

        if (userIsAdmin(req.user)) {
            res.json(Ok(contests));
        } else {
            res.json(Ok(
                contests.filter((contest) => contest.is_public).map(toPublicContest),
            ));
        }
    } catch (err) {
        res.json(Err('Failed to get contests.'));
        return;
    }
}

async function getContestRegistrants(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const result = await pool.query(
            `SELECT U.username, U.display_name
             FROM ContestRegistrations CR
                      JOIN Users U ON CR.contest_id = U.id
             WHERE CR.contest_id = $1`,
        [req.contest.id],
    );

    const users = result.rows as Partial<User>[];

    res.json(Ok(users));
}

class CreateContestProblemProps {
    @IsNotEmpty() contest_problem_slug: string;
    @IsNumber() problem_id: number;
}

class CreateContestProps {
    @IsBoolean() is_public: boolean = false;
    @IsNotEmpty() slug: string;
    @IsString() title: string = '';
    @ValidateNested({each: true}) @Type(() => CreateContestProblemProps) problems: CreateContestProblemProps[] = [];
    @IsDate() @Type(() => Date) start_time: Date = new Date(0);
    @IsDate() @Type(() => Date) end_time: Date = new Date(0);
}

async function validateProblemSlugs(problems: CreateContestProblemProps[]): Promise<void> {
    const {pool} = AppState.get();

    // Check that the problem slugs are unique.
    {
        const slugSet = new Set([...problems.map((problem) => problem.contest_problem_slug)]);
        const idSet = new Set([...problems.map((problem) => problem.problem_id)]);

        if (slugSet.size !== problems.length || idSet.size !== problems.length) {
            throw Err('Problem slugs and/or IDs are not unique.');
        }
    }

    // Check that the problem slugs are valid.
    {
        const result = await pool.query(
                `SELECT *
                 FROM Problems
                 WHERE id = ANY ($1)`,
            [problems.map((slug) => slug.problem_id)],
        );

        if (result.rowCount !== problems.length) {
            const existingSlugs: Set<number> = new Set(result.rows.map((problem: Problem) => problem.id));
            const wrongSlugs = problems.filter((slug) => !existingSlugs.has(slug.problem_id));
            throw Err('Invalid problem IDs.', wrongSlugs);
        }
    }
}

async function createContestProblems(client: PoolClient, contest: Contest, problems: CreateContestProblemProps[]): Promise<ContestProblem[]> {
    // create each problem
    const contestProblems = [];
    for (const problemSlug of problems) {
        const result = await client.query(
                `INSERT INTO ContestProblems (slug, contest_id, problem_id)
                 VALUES ($1, $2, $3)
                 RETURNING *`,
            [problemSlug.contest_problem_slug, contest.id, problemSlug.problem_id],
        );

        if (result.rowCount !== 1)
            throw new Error('Failed to create contest problem.');

        contestProblems.push(result.rows[0] as ContestProblem);
    }

    return contestProblems;
}

async function createContest(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const {is_public, slug, title, problems, start_time, end_time} = req.body as CreateContestProps;

    // Check that the slug is not already used
    {
        const result = await pool.query(
                `SELECT *
                 FROM Contests
                 WHERE slug = $1`,
            [slug],
        );

        if (result.rowCount !== 0) {
            res.json(Err('The slug is already used.'));
            return;
        }
    }

    try {
        await validateProblemSlugs(problems);
    } catch (errResponse) {
        res.json(errResponse);
        return;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
                `INSERT INTO Contests (is_public, slug, title, start_time, end_time)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
            [is_public, slug, title, start_time, end_time],
        );

        if (result.rowCount !== 1)
            throw new Error('Failed to create contest.');
        const contest = result.rows[0] as Contest;

        const contestProblems = await createContestProblems(client, contest, problems);
        await client.query(`COMMIT`);

        res.json(Ok({
            ...contest,
            problems: contestProblems,
        }));
    } catch (err) {
        console.error(err);
        await client.query('ROLLBACK');
        res.json(Err('Failed to create contest.'));
    } finally {
        client.release();
    }
}

async function getContest(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const contest = req.contest as Contest;

    try {
        const result = await pool.query(
                `SELECT CP.slug AS contest_problem_slug, P.*, P.id AS problem_id, CP.id AS contest_problem_id
                 FROM ContestProblems CP
                          JOIN Problems P on CP.problem_id = P.id
                 WHERE contest_id = $1`,
            [contest.id],
        );

        const contestProblems = result.rows as ContestProblemInfo[];

        if (userIsAdmin(req.user)) {
            res.json(Ok({
                ...contest,
                problems: contestProblems,
            } as Contest));
        } else {
            res.json(Ok({
                ...toPublicContest(contest),
                problems: contestProblems.map(toPublicContestProblemInfo),
            } as PublicContest));
        }
    } catch (err) {
        res.json(Err('Failed to get contest.'));
        return;
    }
}

async function getContestProblem(req: Request, res: Response): Promise<void> {
    if (userIsAdmin) {
        res.json(Ok(req.problem));
    } else {
        res.json(Ok(toPublicProblem(req.problem)));
    }
}

class EditContestProps {
    @IsOptional() @IsBoolean() is_public: boolean = false;
    @IsOptional() @IsNotEmpty() slug: string;
    @IsOptional() @IsString() title: string;
    @IsOptional() @ValidateNested({each: true}) @Type(() => CreateContestProblemProps) problems: CreateContestProblemProps[];
    @IsOptional() @IsDate() @Type(() => Date) start_time: Date;
    @IsOptional() @IsDate() @Type(() => Date) end_time: Date;
}

async function editContest(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const contest = req.contest as Contest;
    const body = req.body as EditContestProps;

    if (typeof body.slug !== 'undefined' && body.slug !== contest.slug) {
        // check whether the slug is already used
        const result = await pool.query(`SELECT *
                                         FROM Contests
                                         WHERE slug = $1`, [body.slug]);

        if (result.rowCount !== 0) {
            res.json(Err('The slug is already used by another contest.'));
            return;
        }
    }

    contest.is_public = body.is_public ?? contest.is_public;
    contest.slug = body.slug ?? contest.slug;
    contest.title = body.title ?? contest.title;
    contest.start_time = body.start_time ?? contest.start_time;
    contest.end_time = body.end_time ?? contest.end_time;

    if (body.problems ?? false) {
        try {
            await validateProblemSlugs(body.problems);
        } catch (errResponse) {
            res.json(errResponse);
            return;
        }
    }

    const client = await pool.connect();

    try {
        await client.query(
                `UPDATE Contests
                 SET is_public  = $1,
                     slug       = $2,
                     title      = $3,
                     start_time = $4,
                     end_time   = $5
                 WHERE id = $6
                 RETURNING *`,
            [contest.is_public, contest.slug, contest.title, contest.start_time, contest.end_time, contest.id],
        );

        if (body.problems ?? false) {
            await client.query(`DELETE
                                FROM ContestProblems
                                WHERE contest_id = $1`, [contest.id]);
            await createContestProblems(client, contest, body.problems);
        }

        await client.query(`COMMIT`);

        const result = await pool.query(
                `SELECT CP.slug AS contest_problem_slug, P.*
                 FROM ContestProblems CP
                          JOIN Problems P on CP.problem_id = P.id
                 WHERE contest_id = $1`,
            [contest.id],
        );

        await getContest(req, res);
        // res.json(Ok({
        //     ...contest,
        //     problems: result.rows as ContestProblemInfo[],
        // } as Contest))
    } catch (err) {
        console.error(err);
        await client.query('ROLLBACK');
        res.json(Err('Failed to edit contest.'));
    } finally {
        client.release();
    }
}

async function deleteContest(req: Request, res: Response): Promise<void> {
    // TODO drop linked resource
    const {pool} = AppState.get();

    try {
        await pool.query(
                `DELETE
                 FROM Contests
                 WHERE id = $1`,
            [req.contest.id],
        );

        res.json(Ok());
    } catch (err) {
        console.error(err);
        res.json(Err('Failed to delete contest.'));
    }
}

class SubmitToContestProps {
    @IsNotEmpty() language: string;
    @IsString() source_code: string;
}

async function submitToContest(req: Request, res: Response): Promise<void> {
    const {pool, queue} = AppState.get();
    const {language, source_code} = req.body as SubmitToContestProps;

    const submission: Partial<Submission> = {
        user_id: req.user.id,
        problem_id: req.problem.id,
        contest_id: req.contest.id,
        contest_problem_id: req.contestProblem.id,
        language,
        source_code,
        verdict: 'WJ',
    };

    const result = await pool.query(
            `INSERT INTO Submissions (user_id, problem_id, contest_id, contest_problem_id, language, source_code,
                                      verdict)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
        [submission.user_id, submission.problem_id, submission.contest_id, submission.contest_problem_id, submission.language, submission.source_code, submission.verdict],
    );

    if (result.rowCount !== 1) {
        res.json(Err('Failed to submit.'));
        return;
    }

    const {id} = result.rows[0];

    try {
        // Push submission ID to queue.
        const channel = await queue.createChannel();
        await channel.assertQueue('JUDGE_QUEUE');
        await channel.sendToQueue('JUDGE_QUEUE', Buffer.from(id.toString()));
    } catch (err) {
        console.error(err);
        res.json(Err('Failed to push submission into judge queue.'));
        return;
    }

    res.json(Ok({id}));
}

// Return list of submissions and verdict, without the source code.
async function getContestSubmissions(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const {contest} = req;

    const submissions = await pool.query(`
                SELECT S.*, U.username, P.slug AS problem_slug, C.slug AS contest_slug, CP.slug AS contest_problem_slug
                FROM Submissions S
                         JOIN Problems P on S.problem_id = P.id
                         JOIN Users U on S.user_id = U.id
                         LEFT JOIN Contests C on S.contest_id = C.id
                         LEFT JOIN ContestProblems CP on S.contest_problem_id = CP.id
                WHERE S.contest_id = $1`,
        [contest.id],
    )
        .then((result) => result.rows as RichSubmission[])
        .then((result) => result.map(({id, date, language, memory, time, verdict, contest_problem_slug}: RichSubmission) => ({
            id, date, contest_problem_slug, language, verdict, memory, time,
        })));

    res.json(Ok(submissions));
}

export default contestsRouter;
