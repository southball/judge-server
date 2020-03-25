import * as debug from 'debug';
import * as dotenv from 'dotenv';
import {AppState} from './app-state';
import {Pool} from 'pg';
import createServer from './server';

const log = debug('judge-server:index');
dotenv.config();

AppState.set({
    pool: new Pool(),
});

async function main(): Promise<void> {
    const app = createServer();
    const port = parseInt(process.env.PORT, 10);
    log(`Server is listening on port ${port}.`);
    app.listen(port);
}

main();
