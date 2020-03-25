export interface Problem {
    id: number;
    public: boolean;
    slug: string;
    title: string;
    time_limit: number;
    memory_limit: number;
}

export interface Contest {
    id: number;
    public: boolean;
    slug: string;
    title: string;
}

export interface User {
    id: number;
    username: string;
    display_name: string;
    password_hash: string;
    password_salt: string;
    permissions: string[];
}

export interface ContestProblem {
    id: number;
    slug: string;
    contest_id: number;
    problem_id: number;
}

export interface Submission {
    id: number;
    date: Date;
    user_id: number;
    problem_id: number;
    contest_id: number;
    contest_problem_id: number;
    language: string;
    source_code: string;
    verdict: string;
    time: number;
    memory: number;
    verdict_json: string;
}
