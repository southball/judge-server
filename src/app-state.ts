import {Pool} from 'pg';
import * as amqplib from 'amqplib';

export interface AppStateFragment {
    // Connection pool for database.
    pool: Pool;
    // Key for JSON Web Token.
    key: string;
    // Connection for RabbitMQ.
    queue: amqplib.Connection;
}

export class AppState {
    private static state: AppStateFragment;

    public static get(): AppStateFragment {
        return AppState.state;
    }

    public static set(state: AppStateFragment): void {
        AppState.state = state;
    }
}
