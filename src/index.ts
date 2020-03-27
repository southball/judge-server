import 'reflect-metadata';

import * as debug from 'debug';
import * as dotenv from 'dotenv';
import {AppState} from './app-state';
import {Pool} from 'pg';
import createServer from './server';
import {resetDatabaseWithDummyData} from "./data";

const log = debug('judge-server:index');
dotenv.config();

async function main(): Promise<void> {
    initAppState();

    const app = createServer();
    const port = parseInt(process.env.PORT, 10);
    log(`Server is listening on port ${port}.`);
    app.listen(port);
}

function initAppState(): void {
    const key = process.env.KEY;
    if (typeof key !== 'string' || key.length <= 16) {
        throw new Error('The key is invalid, or it is less than 16 bytes, which is too insecure.');
    }

    const pool = new Pool();

    AppState.set({pool, key});
}

if (require.main === module)
    main();
