import {NextFunction, Request, Response, Router} from 'express';
import {Err, Ok} from '../json';
import {AppState} from '../app-state';
import {Problem, toPublicProblem} from '../models';
import {authAdminMiddleware, Permissions, userIsAdmin} from '../auth';
import {bodySingleTransformerMiddleware} from '../validation';
import {IsBoolean, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, Matches} from 'class-validator';

export class ProblemType {
    public static STANDARD = 'standard';
    public static INTERACTIVE = 'interactive';
}

export function problemsRouter(): Router {
    const router = Router();

    router.get('/problems', getProblems);
    router.post('/problems', authAdminMiddleware, bodySingleTransformerMiddleware(CreateProblemProps), createProblem);

    router.param('problem_slug', fetchProblemBySlug);

    router.get('/problem/:problem_slug', getProblem);
    router.put('/problem/:problem_slug', authAdminMiddleware, bodySingleTransformerMiddleware(EditProblemProps), editProblem);
    router.delete('/problem/:problem_slug', authAdminMiddleware, deleteProblem);

    router.get('/problem/:problem_slug/testcases', authAdminMiddleware, getTestcases);
    router.put('/problem/:problem_slug/testcases', authAdminMiddleware, updateTestcases);

    return router;
}

/**
 * Set `req.problem` to the problem with `slug` equal to `problem_slug` if found, and errs otherwise.
 */
async function fetchProblemBySlug(req: Request, res: Response, next: NextFunction, problem_slug: string): Promise<void> {
    const {pool} = AppState.get();

    const result = await pool.query(
            `SELECT *
             FROM Problems
             WHERE slug = $1`,
        [problem_slug],
    );

    if (result.rowCount === 0) {
        res.json(Err('Problem not found.'));
        return;
    }

    const problem = result.rows[0] as Problem;

    if (problem.is_public !== true && !userIsAdmin(req.user)) {
        res.json(Err('Problem not found.'));
        return;
    }

    req.problem = problem;
    next();
}

async function getProblems(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const result = await pool.query(`SELECT *
                                     FROM Problems`);
    const problems = result.rows as Problem[];

    if (req.user?.permissions.includes(Permissions.ADMIN)) {
        res.json(Ok(problems));
    } else {
        res.json(Ok(
            problems
                .filter((problem) => problem.is_public)
                .map(toPublicProblem)
        ));
    }
}

class CreateProblemProps {
    @IsNotEmpty() access_token: string;
    @IsNotEmpty() type: string = ProblemType.STANDARD;
    @IsBoolean() is_public: boolean = false;
    @IsNotEmpty() @Matches(/^[A-Za-z0-9_-]+$/i) slug: string;
    @IsNotEmpty() title: string;
    @IsNotEmpty() statement: string;
    @IsNumber() time_limit: number = 1.0;
    @IsNumberString() memory_limit: string = '256000';
    @IsNumber() compile_time_limit: number = 15.0;
    @IsNumberString() compile_memory_limit: string = '1024000';
    @IsNumber() checker_time_limit: number = 1.0;
    @IsNumberString() checker_memory_limit: string = '256000';
    @IsString() checker: string = '';
    @IsString() interactor: string = '';
}

async function createProblem(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const {is_public, type, slug, title, statement, time_limit, memory_limit, compile_time_limit, compile_memory_limit, checker_time_limit, checker_memory_limit} = req.body as CreateProblemProps;

    // Check that problem with the same slug does not exist.
    {
        const result = await pool.query(
                `SELECT *
                 FROM Problems
                 WHERE slug = $1`,
            [slug],
        );

        if (result.rowCount !== 0) {
            res.status(400).json(Err('Problem with the same slug already exists.'));
            return;
        }
    }

    try {
        const result = await pool.query(
                `INSERT INTO Problems (is_public, type, slug, title, statement, time_limit, memory_limit,
                                       compile_time_limit,
                                       compile_memory_limit, checker_time_limit, checker_memory_limit)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING *`,
            [is_public, type, slug, title, statement, time_limit, memory_limit, compile_time_limit, compile_memory_limit, checker_time_limit, checker_memory_limit]
        );

        if (result.rowCount !== 1)
            throw new Error('Expected row count to be 1.');

        res.json(Ok(result.rows[0] as Problem));
    } catch (err) {
        console.error(err);
        res.status(500).json(Err('Failed to create problem.'));
    }
}

async function getProblem(req: Request, res: Response): Promise<void> {
    if (userIsAdmin(req.user)) {
        res.json(Ok(req.problem));
    } else {
        res.json(Ok(toPublicProblem(req.problem)));
    }
}

class EditProblemProps {
    @IsOptional() @IsNotEmpty() access_token: string;
    @IsOptional() @IsNotEmpty() type: string = ProblemType.STANDARD;
    @IsOptional() @IsBoolean() is_public: boolean = false;
    @IsOptional() @IsNotEmpty() @Matches(/^[A-Za-z0-9_-]+$/i) slug: string;
    @IsOptional() @IsNotEmpty() title: string;
    @IsOptional() @IsNotEmpty() statement: string;
    @IsOptional() @IsNumber() time_limit: number;
    @IsOptional() @IsNumberString() memory_limit: string;
    @IsOptional() @IsNumber() compile_time_limit: number;
    @IsOptional() @IsNumberString() compile_memory_limit: string;
    @IsOptional() @IsNumber() checker_time_limit: number;
    @IsOptional() @IsNumberString() checker_memory_limit: string;
    @IsOptional() @IsString() checker: string;
    @IsOptional() @IsString() interactor: string;
}

async function editProblem(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const problem = req.problem as Problem;
    const body = req.body as EditProblemProps;

    if (typeof body.slug !== 'undefined' && body.slug !== problem.slug) {
        // check whether the slug is already used
        const result = await pool.query(
                `SELECT *
                 FROM Problems
                 WHERE slug = $1`,
            [body.slug],
        );

        if (result.rowCount !== 0) {
            res.json(Err('The slug is already used by another problem.'));
            return;
        }
    }

    const original_slug = problem.slug;

    problem.type = body.type ?? problem.type;
    problem.is_public = body.is_public ?? problem.is_public;
    problem.slug = body.slug ?? problem.slug;
    problem.title = body.title ?? problem.title;
    problem.statement = body.statement ?? problem.statement;
    problem.time_limit = body.time_limit ?? problem.time_limit;
    problem.memory_limit = body.memory_limit ?? problem.memory_limit;
    problem.compile_time_limit = body.compile_time_limit ?? problem.compile_time_limit;
    problem.compile_memory_limit = body.compile_memory_limit ?? problem.compile_memory_limit;
    problem.checker_time_limit = body.checker_time_limit ?? problem.checker_time_limit;
    problem.checker_memory_limit = body.checker_memory_limit ?? problem.checker_memory_limit;
    problem.checker = body.checker ?? problem.checker;
    problem.interactor = body.interactor ?? problem.interactor;

    const result = await pool.query(
            `UPDATE Problems
             SET type=$1,
                 is_public=$2,
                 slug=$3,
                 title=$4,
                 statement=$5,
                 time_limit=$6,
                 memory_limit=$7,
                 compile_time_limit=$8,
                 compile_memory_limit=$9,
                 checker_time_limit=$10,
                 checker_memory_limit=$11,
                 checker=$12,
                 interactor=$13
             WHERE slug = $14
             RETURNING *;
        `,
        [problem.type, problem.is_public, problem.slug, problem.title, problem.statement, problem.time_limit, problem.memory_limit, problem.compile_time_limit, problem.compile_memory_limit, problem.checker_time_limit, problem.checker_memory_limit, problem.checker, problem.interactor, original_slug]
    );

    if (result.rowCount !== 1) {
        res.json(Err('Failed to edit problem.'));
    } else {
        res.json(Ok(result.rows[0] as Problem));
    }
}

async function deleteProblem(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const problem = req.problem;
    const result = await pool.query(
            `DELETE
             FROM Problems
             WHERE slug = $1`,
        [problem.slug]
    );

    if (result.rowCount === 1) {
        res.json(Ok());
    } else {
        res.status(500).json(Err('Failed to delete problem.'));
    }
}

async function getTestcases(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

async function updateTestcases(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

export default problemsRouter;
