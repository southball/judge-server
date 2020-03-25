import {Pool, Client} from 'pg';
import * as dotenv from 'dotenv';
import * as express from 'express';
import * as bodyParser from 'body-parser';

dotenv.config();

async function main() {
    const app = express();
    const pool = new Pool();

    app.use(bodyParser.json());

}

main();
