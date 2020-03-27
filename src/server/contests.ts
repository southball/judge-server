import {NextFunction, Request, Response, Router} from 'express';
import {Err, Ok} from '../json';
import {authAdminMiddleware, authUserMiddleware, userIsAdmin} from '../auth';
import {AppState} from '../app-state';
import {
    Contest,
    ContestProblem,
    ContestProblemInfo,
    Problem, PublicContest,
    toPublicContest,
    toPublicContestProblemInfo
} from '../models';
import {bodySingleTransformerMiddleware} from '../validation';
import {ArrayUnique, IsBoolean, IsDate, IsNotEmpty, IsNumber, ValidateNested} from "class-validator";
import {Type} from "class-transformer";

export function contestsRouter(): Router {
    const router = Router();

    router.get('/contests', getContests);
    router.post('/contests',
        authAdminMiddleware,
        bodySingleTransformerMiddleware(CreateContestProps),
        createContest);

    router.param('contest_slug', fetchContestFromSlug);

    router.get('/contest/:contest_slug', getContest);
    router.put('/contest/:contest_slug',
        authAdminMiddleware,
        bodySingleTransformerMiddleware(EditContestProps),
        editContest);
    router.delete('/contest/:contest_slug',
        authAdminMiddleware,
        deleteContest);

    router.post('/contest/:contest_slug/submit',
        authUserMiddleware,
        bodySingleTransformerMiddleware(SubmitToContestProps),
        submitToContest);
    router.get('/contest/:contest_slug/scoreboard', getContestScoreboard);

    return router;
}

/**
 * Set `req.contest` to the contest with `id` equal to `contest_slug` if found, and errs otherwise.
 */
async function fetchContestFromSlug(req: Request, res: Response, next: NextFunction, contest_slug: string): Promise<void> {
    const {pool} = AppState.get();

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

    next();
}

async function getContests(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();

    try {
        const result = await pool.query(`SELECT * FROM Contests`);
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

class CreateContestProblemProps {
    @IsNotEmpty() slug: string;
    @IsNumber() id: number;
}

class CreateContestProps {
    @IsNotEmpty() access_token: string;
    @IsBoolean() is_public: boolean = false;
    @IsNotEmpty() slug: string;
    @IsNotEmpty() title: string;
    @ValidateNested({each: true}) @Type(() => CreateContestProblemProps) problems: CreateContestProblemProps[];
    @IsDate() @Type(() => Date) start_time: Date;
    @IsDate() @Type(() => Date) end_time: Date;
}

async function createContest(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const {is_public, slug, title, problems, start_time, end_time} = req.body as CreateContestProps;

    // Check that the slug is not already used
    {
        const result = await pool.query(
            `SELECT * FROM Contests WHERE slug=$1`,
            [slug],
        );

        if (result.rowCount !== 0) {
            res.json(Err('The slug is already used.'));
            return;
        }
    }

    // Check that the problem slugs are unique.
    {
        const slugSet = new Set([...problems.map((problem) => problem.slug)]);
        const idSet = new Set([...problems.map((problem) => problem.id)]);

        if (slugSet.size !== problems.length || idSet.size !== problems.length) {
            res.json(Err('Problem slugs and/or IDs are not unique.'));
            return;
        }
    }

    // Check that the problem slugs are valid.
    {
        const result = await pool.query(
            `SELECT * FROM Problems WHERE id = ANY ($1)`,
            [problems.map((slug) => slug.id)],
        );

        if (result.rowCount !== problems.length) {
            const existingSlugs: Set<number> = new Set(result.rows.map((problem: Problem) => problem.id));
            const wrongSlugs = problems.filter((slug) => !existingSlugs.has(slug.id));
            res.json(Err('Invalid problem IDs.', wrongSlugs));
            return;
        }
    }

    // Begin transaction
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO Contests (is_public, slug, title, start_time, end_time) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [is_public, slug, title, start_time, end_time],
        );

        if (result.rowCount !== 1)
            throw new Error('Failed to create contest.');
        const contest = result.rows[0] as Contest;

        // create each problem
        const contestProblems = [];
        for (const problemSlug of problems) {
            const result = await client.query(
                `INSERT INTO ContestProblems (slug, contest_id, problem_id) VALUES ($1, $2, $3) RETURNING *`,
                [problemSlug.slug, contest.id, problemSlug.id],
            );

            if (result.rowCount !== 1)
                throw new Error('Failed to create contest problem.');

            contestProblems.push(result.rows[0] as ContestProblem);
        }

        await client.query(`COMMIT`);

        res.json(Ok({
            ...contest,
            problems: contestProblems,
        }));
    } catch(err) {
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
            `SELECT CP.slug AS contest_problem_slug, P.* FROM ContestProblems CP 
            JOIN Problems P on CP.problem_id = P.id
            WHERE contest_id=$1`,
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

class EditContestProps {
}

async function editContest(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

async function deleteContest(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

class SubmitToContestProps {
}

async function submitToContest(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

async function getContestScoreboard(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

export default contestsRouter;
