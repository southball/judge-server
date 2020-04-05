import * as amqplib from 'amqplib';
import axios from 'axios';
import * as debug from 'debug';
import * as dotenv from 'dotenv';

import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import {Pool} from 'pg';
import 'reflect-metadata';
import * as socketIO from 'socket.io';
import {AppState} from './app-state';
import createServer from './server';
import {initSocketIO} from './websocket/websocket';

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
    const httpServer = new http.Server(app);
    const io = socketIO(httpServer);

    AppState.set({io});
    await initSocketIO();

    log(`Server is listening on port ${port}.`);
    httpServer.listen(port);
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
