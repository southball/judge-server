import {Pool} from 'pg';
import * as amqplib from 'amqplib';
import * as SocketIO from 'socket.io';

export interface AppStateFragment {
    // Connection pool for database.
    pool: Pool;
    // Key for JSON Web Token.
    key: string;
    // Connection for RabbitMQ.
    queue: amqplib.Connection;
    // Socket-IO instance.
    io: SocketIO.Server;
}

export class AppState {
    private static state: AppStateFragment = {
        pool: undefined,
        key: undefined,
        queue: undefined,
        io: undefined,
    };

    public static get(): AppStateFragment {
        return AppState.state;
    }

    public static set(stateFragment: Partial<AppStateFragment>): void {
        AppState.state = {...AppState.state, ...stateFragment};
    }
}
