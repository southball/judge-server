import {IsNumber} from 'class-validator';
import {Request, Response, Router} from 'express';
import * as fs from 'fs';
import * as path from 'path';
import {AppState} from '../app-state';
import {authAdminMiddleware} from '../auth';
import {Ok} from '../json';
import {RichSubmission, User} from '../models';
import {bodySingleTransformerMiddleware} from '../validation';

export function adminRouter(): Router {
    const router = Router();

    router.get('/admin/submissions', authAdminMiddleware, bodySingleTransformerMiddleware(GetSubmissionsProps), getSubmissions);
    router.get('/admin/users', authAdminMiddleware, getUsers);
    router.get('/admin/testlib', authAdminMiddleware, getTestlib);

    return router;
}

class GetSubmissionsProps {
    @IsNumber() limit: number = 1000;
}

async function getSubmissions(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const {limit} = req.body as GetSubmissionsProps;

    const result = await pool.query(
            `SELECT S.*, U.username, P.slug AS problem_slug, C.slug AS contest_slug, CP.slug AS contest_problem_slug
             FROM Submissions S
                      JOIN Problems P on S.problem_id = P.id
                      JOIN Users U on S.user_id = U.id
                      LEFT JOIN Contests C on S.contest_id = C.id
                      LEFT JOIN ContestProblems CP on S.contest_problem_id = CP.id
             ORDER BY S.date DESC
             LIMIT $1
        `,
        [limit],
    );

    const submissions = result.rows as Partial<RichSubmission>[];
    res.json(Ok(submissions));
}

async function getUsers(req: Request, res: Response): Promise<void> {
    const {pool} = AppState.get();
    const result = await pool.query(`SELECT id, username, email, display_name, permissions
                                     FROM Users`);
    const users = result.rows as Partial<User>[];

    res.json(Ok(users));
}

async function getTestlib(req: Request, res: Response): Promise<void> {
    const testlib = fs.readFileSync(path.resolve(process.env.DATAFOLDER, 'testlib.h'));

    res.type('application/octet-stream')
        .end(testlib);
}
