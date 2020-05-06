import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';
import {Express} from 'express';
import {userMiddleware} from '../auth';
import {resetDatabaseWithDummyData} from '../data';
import {Err} from '../json';
import {adminRouter} from './admin';
import authRouter from './auth';
import contestsRouter from './contests';
import problemsRouter from './problems';
import submissionsRouter from './submissions';
import usersRouter from './users';

export default function createServer(): Express {
    const app = express();

    app.use(cors());
    app.use(bodyParser.json());
    app.use(userMiddleware);

    app.use(authRouter());
    app.use(contestsRouter());
    app.use(problemsRouter());
    app.use(submissionsRouter());
    app.use(adminRouter());
    app.use(usersRouter());

    // TODO remove from project
    if (process.env.NODE_ENV === 'development') {
        app.get('/reset_db', resetDatabaseWithDummyData);
    }

    app.all('*', (_req, res) => {
        res.json(Err('The requested resource is not found.'));
    });

    return app;
}
