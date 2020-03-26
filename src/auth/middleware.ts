import {NextFunction, Request, Response} from 'express';
import * as jwt from 'jsonwebtoken';
import {AppState} from '../app-state';
import {Err} from '../json';
import {JWTTokenPayload} from './helper';
import {User} from '../models';
import {Permissions} from "./permissions";

export const userMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {key, pool} = AppState.get();
    if (typeof req.body.access_token === 'string') {
        try {
            const {refresh, username} = jwt.verify(req.body.access_token, key) as JWTTokenPayload;
            if (typeof username !== 'string')
                throw new Error('Username is not a string.');

            const user = await pool.query(
                'SELECT * FROM Users WHERE username=$1',
                [username],
            );
            if (user.rowCount === 0)
                throw new Error('User with given username not found.');

            req.user = user.rows[0] as User;
        } catch (err) {
            res.json(Err('Invalid access token.'));
            return;
        }
    }

    next();
}

// A middleware to ensure that the user is authenticated.
// If `permission` is supplied, it also ensure that the user has at least one of the permissions.
export const authMiddleware = (permission?: string | string[]) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (typeof req.user === 'undefined') {
            res.status(403).json(Err('Not authenticated.'));
            return;
        }

        if (typeof permission !== 'undefined') {
            const requiredPermissions = Array.isArray(permission) ? permission : [permission];
            const permitted = requiredPermissions.some((permission) => req.user.permissions.includes(permission));

            if (!permitted) {
                res.status(403).json(Err('Not enough permission.'));
                return;
            }
        }

        next();
    };

export const authUserMiddleware = authMiddleware();
export const authAdminMiddleware = authMiddleware(Permissions.ADMIN);
export const authJudgeMiddleware = authMiddleware([Permissions.ADMIN, Permissions.JUDGE]);
