import { Request, Response, Router, NextFunction } from 'express';
import { userIsAdmin } from '../auth';
import { Ok, Err } from '../json';
import { AppState } from '../app-state';
import { User } from '../models';
import { IsOptional, IsString, IsEmail, IsArray } from 'class-validator';
import { bodySingleTransformerMiddleware } from '../validation';
import { authUserMiddleware } from '../auth';

export function usersRouter(): Router {
    const router = Router();

    router.param('username', fetchUser);

    router.get('/users', getUsers);

    router.get('/user/:username', getUser);
    router.put('/user/:username', authUserMiddleware, bodySingleTransformerMiddleware(EditUserProps), editUser);

    return router;
}

async function fetchUser(req: Request, res: Response, next: NextFunction, username: string) {
    const { pool } = AppState.get();

    const result = await pool.query(
        `
        SELECT * 
        FROM Users
        WHERE username=$1
        `,
        [username],
    );

    if (result.rowCount === 0) {
        res.json(Err('The requested resource is not found.'));
        return;
    }

    const user = result.rows[0] as User;

    req.queryUser = user;
    next();
}

async function getUsers(req: Request, res: Response) {
    const {pool} = AppState.get();
    const result = await pool.query(`SELECT * FROM Users`);
    const users = (result.rows as User[]).map((user) => {
        delete user.password_hash;
        delete user.password_salt;
        return user;
    });

    if (userIsAdmin(req.user)) {
        res.json(Ok(users));
    } else {
        res.json(Ok(users.map((user) => ({
            username: user.username,
            display_name: user.display_name,
            registration_time: user.registration_time,
        }))));
    }
}

async function getUser(req: Request, res: Response) {
    // drop the password fields
    delete req.queryUser.password_hash;
    delete req.queryUser.password_salt;

    if (userIsAdmin(req.user)) {
        res.json(Ok(req.queryUser));
    } else {
        // TODO pick fields
        res.json(Ok({
            username: req.queryUser.username,
            display_name: req.queryUser.display_name,
            registration_time: req.queryUser.registration_time,
            ...(req.user.username === req.queryUser.username ? {
                email: req.queryUser.email,
                permissions: req.queryUser.permissions,
            } : {}),
        } as User));
    }
}

class EditUserProps {
    @IsOptional() @IsString() display_name: string;
    @IsOptional() @IsEmail() email: string;
    @IsOptional() @IsString({ each: true }) permissions: string[];
}

async function editUser(req: Request, res: Response) {
    const { pool } = AppState.get();
    const user = req.queryUser as User;
    const body = req.body as EditUserProps;

    if (!(userIsAdmin(req.user) || req.user.username === user.username)) {
        res.json(Err('You do not have permission to edit this user!'));
        return;
    }

    user.display_name = body.display_name ?? user.display_name;
    user.email = body.email ?? user.email;

    if (userIsAdmin(req.user)) {
        user.permissions = body.permissions ?? user.permissions;
    }

    const result = await pool.query(
        `UPDATE Users
            SET display_name = $1,
                email = $2,
                permissions = $3
            WHERE id = $4
            `,
        [user.display_name, user.email, user.permissions, user.id],
    );

    if (result.rowCount !== 1) {
        res.json(Err('Failed to edit user.'));
    } else {
        await getUser(req, res);
    }
}

export default usersRouter;
