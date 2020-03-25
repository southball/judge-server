import * as bodyParser from 'body-parser';
import * as express from 'express';
import {Err, Ok} from '../json';
import {Express} from 'express';
import authRouter from './auth';
import contestsRouter from './contests';
import problemsRouter from './problems';
import submissionsRouter from './submissions';

export default function createServer(): Express {
    const app = express();

    app.use(bodyParser.json());

    app.use('/auth', authRouter());
    app.use('/contests', contestsRouter());
    app.use('/problems', problemsRouter());
    app.use('/submissions', submissionsRouter());

    app.all('*', (_req, res) => {
        res.json(Err('The requested resource is not found.'));
    });

    return app;
}
