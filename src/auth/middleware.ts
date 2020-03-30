import {NextFunction, Request, Response} from 'express';
import * as jwt from 'jsonwebtoken';
import {AppState} from '../app-state';
import {Err} from '../json';
import {User} from '../models';
import {JWTTokenPayload, userIs} from './helper';
import {Permissions} from './permissions';

export const userMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {key, pool} = AppState.get();

    let accessToken: string | null = null;

    const authorization = req.header('authorization');
    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
        accessToken = authorization.replace(/^Bearer (.*)$/, '$1');
    }

    if (accessToken !== null) {
        try {
            const {refresh, username} = jwt.verify(accessToken, key) as JWTTokenPayload;
            if (refresh !== false)
                throw new Error('Cannot use refresh token as access token.');
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
            const permitted = requiredPermissions.some((permission) => userIs(permission, req.user));

            if (!permitted) {
                res.status(403).json(Err('Not enough permission.'));
                return;
            }
        }

        next();
    };

export const authUserMiddleware = authMiddleware();
export const authAdminMiddleware = authMiddleware(Permissions.ADMIN);
