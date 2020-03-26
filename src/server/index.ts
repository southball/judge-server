import * as bodyParser from 'body-parser';
import * as express from 'express';
import {Err} from '../json';
import {Express} from 'express';
import authRouter from './auth';
import contestsRouter from './contests';
import problemsRouter from './problems';
import submissionsRouter from './submissions';
import {userMiddleware} from '../auth';

export default function createServer(): Express {
    const app = express();

    app.use(bodyParser.json());
    app.use(userMiddleware);

    app.use(authRouter());
    app.use(contestsRouter());
    app.use(problemsRouter());
    app.use(submissionsRouter());

    app.all('*', (_req, res) => {
        res.json(Err('The requested resource is not found.'));
    });

    return app;
}
