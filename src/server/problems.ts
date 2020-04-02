import * as archiver from 'archiver';
import * as bodyParser from 'body-parser';
import {IsBoolean, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, Matches} from 'class-validator';
import {NextFunction, Request, Response, Router} from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import * as unzipper from 'unzipper';
import * as yaml from 'yaml';
import {AppState} from '../app-state';
import {authAdminMiddleware, authUserMiddleware, Permissions, userIsAdmin} from '../auth';
import {Err, Ok} from '../json';
import {Problem, Submission, toPublicProblem} from '../models';
import {bodySingleTransformerMiddleware} from '../validation';

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

    router.post('/problem/:problem_slug/submit', authUserMiddleware, bodySingleTransformerMiddleware(SubmitProblemProps), submitProblem);

    router.get('/problem/:problem_slug/testcases', authAdminMiddleware, getTestcases);
    router.put('/problem/:problem_slug/testcases',
        authAdminMiddleware,
        bodyParser.raw({limit: process.env.UPLOADLIMIT, type: 'application/zip'}),
        updateTestcases);

    router.get('/problem/:problem_slug/checker', authAdminMiddleware, getChecker);
    router.get('/problem/:problem_slug/interactor', authAdminMiddleware, getInteractor);
    router.get('/problem/:problem_slug/metadata', authAdminMiddleware, getMetadata);

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
        res.json(Err('The requested resource is not found.'));
        return;
    }

    const problem = result.rows[0] as Problem;

    if (problem.is_public !== true && !userIsAdmin(req.user)) {
        res.json(Err('The requested resource is not found.'));
        return;
    }

    req.problem = problem;
    next();
}

async function getProblems(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const result = await pool.query(`SELECT *
                                     FROM Problems
                                     ORDER BY id ASC`);
    const problems = result.rows as Problem[];

    if (req.user?.permissions.includes(Permissions.ADMIN)) {
        res.json(Ok(problems));
    } else {
        res.json(Ok(
            problems
                .filter((problem) => problem.is_public)
                .map(toPublicProblem),
        ));
    }
}

class CreateProblemProps {
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
            [is_public, type, slug, title, statement, time_limit, memory_limit, compile_time_limit, compile_memory_limit, checker_time_limit, checker_memory_limit],
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
             SET type                 = $1,
                 is_public            = $2,
                 slug                 = $3,
                 title                = $4,
                 statement            = $5,
                 time_limit           = $6,
                 memory_limit         = $7,
                 compile_time_limit   = $8,
                 compile_memory_limit = $9,
                 checker_time_limit   = $10,
                 checker_memory_limit = $11,
                 checker              = $12,
                 interactor           = $13,
                 last_update          = NOW()
             WHERE id = $14
             RETURNING *;
        `,
        [problem.type, problem.is_public, problem.slug, problem.title, problem.statement, problem.time_limit, problem.memory_limit, problem.compile_time_limit, problem.compile_memory_limit, problem.checker_time_limit, problem.checker_memory_limit, problem.checker, problem.interactor, problem.id],
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
        [problem.slug],
    );

    if (result.rowCount === 1) {
        res.json(Ok());
    } else {
        res.status(500).json(Err('Failed to delete problem.'));
    }
}

class SubmitProblemProps {
    @IsNotEmpty() language: string;
    @IsString() source_code: string;
}

async function submitProblem(req: Request, res: Response): Promise<void> {
    const {pool, queue} = AppState.get();
    const {language, source_code} = req.body as SubmitProblemProps;

    const submission: Partial<Submission> = {
        user_id: req.user.id,
        problem_id: req.problem.id,
        language,
        source_code,
        verdict: 'WJ',
    };

    const result = await pool.query(
            `INSERT INTO Submissions (user_id, problem_id, language, source_code, verdict)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
        [submission.user_id, submission.problem_id, submission.language, submission.source_code, submission.verdict],
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

async function getTestcases(req: Request, res: Response): Promise<void> {
    const folder = path.resolve(process.env.DATAFOLDER, req.problem.slug);
    await fs.promises.mkdir(folder, {recursive: true});

    try {
        const archive = archiver('zip');

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.error(err);
            } else {
                throw err;
            }
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(res);

        archive.directory(folder, false);
        archive.finalize();
    } catch (err) {
        res.status(500).end();
        return;
    }
}

async function updateTestcases(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();

    if (req.is('application/zip') && Buffer.isBuffer(req.body)) {
        const folder = path.resolve(process.env.DATAFOLDER, req.problem.slug);
        fs.mkdirSync(folder, {recursive: true});

        const body = req.body as Buffer;
        const streamify = (buffer: Buffer): stream.PassThrough => {
            const pipe = new stream.PassThrough();
            pipe.end(buffer);
            return pipe;
        };

        const inRule = [/^in\/(.*)\.in$/, /^in\/(.*)\.txt$/, /^(.*)\.in$/];
        const outRule = [/^out\/(.*)\.out$/, /^out\/(.*)\.txt$/, /^(.*)\.out$/];

        const iterator = streamify(body).pipe(unzipper.Parse({forceStream: true}))
        const inFileSet = new Set<string>();
        const outFileSet = new Set<string>();

        const fileWritePromises = [] as Promise<any>[];

        zipLoop: for await (const entry of iterator) {
            if (entry.type !== 'File')
                continue;

            for (const rule of inRule)
                if (rule.test(entry.path)) {
                    const filenamePart = entry.path.match(rule)[1];
                    const location = path.resolve(folder, `${filenamePart}.in`);
                    const stream = entry.pipe(fs.createWriteStream(location));
                    fileWritePromises.push(new Promise((resolve) => stream.on('finish', resolve)));
                    inFileSet.add(filenamePart);
                    continue zipLoop;
                }

            for (const rule of outRule)
                if (rule.test(entry.path)) {
                    const filenamePart = entry.path.match(rule)[1];
                    const location = path.resolve(folder, `${filenamePart}.out`);
                    const stream = entry.pipe(fs.createWriteStream(location));
                    fileWritePromises.push(new Promise((resolve) => stream.on('finish', resolve)));
                    outFileSet.add(filenamePart);
                    continue zipLoop;
                }

            entry.autodrain();
        }

        await Promise.all(fileWritePromises);

        const setIntersect = <T>(a: Set<T>, b: Set<T>): Set<T> => new Set([...a].filter(i => b.has(i)));
        const setDifference = <T>(a: Set<T>, b: Set<T>): Set<T> => new Set([...a].filter(i => !b.has(i)));

        const testcases = [] as [string, string][];
        const warnings = [] as string[];

        setIntersect(inFileSet, outFileSet).forEach((testname) => {
            testcases.push([`${testname}.in`, `${testname}.out`])
        });

        setDifference(inFileSet, outFileSet).forEach((testname) => {
            warnings.push(`Input file ${testname} exists but the corresponding output file does not exist.`);
            fs.unlinkSync(path.resolve(folder, `${testname}.in`));
        });
        setDifference(outFileSet, inFileSet).forEach((testname) => {
            warnings.push(`Output file ${testname} exists but the corresponding input file does not exist.`);
            fs.unlinkSync(path.resolve(folder, `${testname}.out`));
        });

        const result = await pool.query(
                `UPDATE Problems
                 SET testcases = $2,
                     last_update = NOW()
                 WHERE id = $1`,
            [req.problem.id, testcases],
        );

        res.json(Ok({
            testcases,
            warnings,
        }));
    } else {
        res.json(Err('Only MIME type application/zip and the zip file as body is supported.'));
    }
}

async function getChecker(req: Request, res: Response): Promise<void> {
    if (req.problem.checker !== '') {
        res.end(req.problem.checker);
    } else {
        res.status(404).end('Not found.');
    }
}

async function getInteractor(req: Request, res: Response): Promise<void> {
    if (req.problem.interactor !== '') {
        res.end(req.problem.interactor);
    } else {
        res.status(404).end('Not found.');
    }
}

async function getMetadata(req: Request, res: Response): Promise<void> {
    const {title, time_limit, memory_limit, compile_time_limit, compile_memory_limit, checker_time_limit, checker_memory_limit, testcases} = req.problem;

    const metadataYaml = yaml.stringify({
        problem_name: title,
        time_limit,
        memory_limit: +memory_limit,
        compile_time_limit,
        compile_memory_limit: +compile_memory_limit,
        checker_time_limit,
        checker_memory_limit: +checker_memory_limit,
        testcases: testcases.map(([input, output]) => ({input, output})),
    });

    res.type('application/x-yaml')
        .end(metadataYaml);
}

export default problemsRouter;
