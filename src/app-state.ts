import {Pool} from 'pg';

export interface AppStateFragment {
    pool: Pool;
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
