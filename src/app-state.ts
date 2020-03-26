import {Pool} from 'pg';

export interface AppStateFragment {
    // Connection pool for database.
    pool: Pool;
    // Key for JSON Web Token.
    key: string;
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
