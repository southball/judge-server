import * as debug from 'debug';
import * as dotenv from 'dotenv';

import * as fs from 'fs';
import * as path from 'path';
import {Pool} from 'pg';
import 'reflect-metadata';
import {AppState} from './app-state';
import createServer from './server';

const log = debug('judge-server:index');
dotenv.config();

async function main(): Promise<void> {
    initAppState();

    await fs.promises.mkdir(
        path.resolve(process.env.DATAFOLDER),
        {recursive: true},
    );

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
