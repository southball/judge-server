import * as amqplib from 'amqplib';
import * as debug from 'debug';
import * as dotenv from 'dotenv';

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import {Pool} from 'pg';
import 'reflect-metadata';
import {AppState} from './app-state';
import createServer from './server';

const log = debug('judge-server:index');
dotenv.config();

async function main(): Promise<void> {
    await preInit();
    await initAppState();

    await fs.promises.mkdir(
        path.resolve(process.env.DATAFOLDER),
        {recursive: true},
    );

    const app = createServer();
    const port = parseInt(process.env.PORT, 10);
    log(`Server is listening on port ${port}.`);
    app.listen(port);
}

async function preInit(): Promise<void> {
    const testlibUrl = "https://cdn.jsdelivr.net/gh/MikeMirzayanov/testlib@master/testlib.h";
    const testlibPath = path.resolve(process.env.DATAFOLDER, 'testlib.h');

    if (!fs.existsSync(testlibPath)) {
        const response = await axios.get(testlibUrl);
        fs.writeFileSync(testlibPath, response.data);
    }
}

async function initAppState(): Promise<void> {
    const key = process.env.KEY;
    if (typeof key !== 'string' || key.length <= 16) {
        throw new Error('The key is invalid, or it is less than 16 bytes, which is too insecure.');
    }

    const pool = new Pool();
    const queue = await amqplib.connect(process.env.RABBITMQ_URL);

    AppState.set({pool, key, queue});
}

if (require.main === module)
    main();
