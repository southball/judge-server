export interface Problem {
    id: number;
    type: string;
    is_public: boolean;
    slug: string;
    title: string;
    statement: string;
    time_limit: number;
    memory_limit: string;
    compile_time_limit: number;
    compile_memory_limit: string;
    checker_time_limit: number;
    checker_memory_limit: string;
    checker: string;
    interactor: string;
    testcases: string[][];
}

export type PublicProblem = Pick<Problem, 'id' | 'type' | 'slug' | 'title' | 'statement' | 'time_limit' | 'memory_limit'>;

export const toPublicProblem = ({id, type, slug, title, statement, time_limit, memory_limit}: Problem): PublicProblem => ({
    id,
    type,
    slug,
    title,
    statement,
    time_limit,
    memory_limit,
});

export interface Contest {
    id: number;
    is_public: boolean;
    slug: string;
    title: string;
    start_time: Date;
    end_time: Date;
    problems?: ContestProblemInfo[];
}

export type ContestProblemInfo =
    Problem
    & { contest_problem_slug: string; contest_problem_id: number; problem_id: number };

export type PublicContest = Pick<Contest, 'id' | 'slug' | 'title' | 'start_time' | 'end_time'> & {
    problems?: PublicContestProblemInfo[];
};

export type PublicContestProblemInfo = PublicProblem & { contest_problem_slug: string; contest_problem_id: number };

export const toPublicContest = ({id, slug, title, start_time, end_time}: Contest): PublicContest => ({
    id,
    slug,
    title,
    start_time,
    end_time,
});

export const toPublicContestProblemInfo =
    ({
         id,
         type,
         slug,
         title,
         statement,
         time_limit,
         memory_limit,
         contest_problem_slug,
         contest_problem_id,
     }: ContestProblemInfo): PublicContestProblemInfo => ({
        id,
        type,
        slug,
        title,
        statement,
        time_limit,
        memory_limit,
        contest_problem_slug,
        contest_problem_id,
    });

export interface User {
    id: number;
    username: string;
    email: string | null;
    display_name: string;
    password_hash: string;
    password_salt: string;
    permissions: string[];
    registration_time: Date;
}

export interface ContestProblem {
    id: number;
    slug: string;
    contest_id: number;
    problem_id: number;
}

export interface SubmissionTestcase {
    verdict: string;
    time: number;
    memory: number;
}

export interface Submission {
    id: number;
    date: Date;
    user_id: number;
    problem_id: number;
    contest_id: number | null;
    contest_problem_id: number | null;
    language: string;
    source_code: string;
    verdict: string;
    time: number | null;
    memory: number | null;
    verdict_json: string | null;
    compile_message: string | null;
}

export type RichSubmission = Submission & {
    username: string;
    problem_slug: string;
    problem_title: string;
    contest_slug: string;
    contest_title: string;
    contest_problem_slug: string;
    testcases: SubmissionTestcase[] | null;
};

export type SlimSubmission =
    Pick<RichSubmission, 'id' | 'date' | 'language' | 'verdict' | 'time' | 'memory' | 'username' | 'problem_slug' | 'problem_title' | 'contest_slug' | 'contest_title' | 'contest_problem_slug'>;

export type PublicSubmission =
    SlimSubmission & Pick<RichSubmission, 'source_code' | 'testcases'>;

export const toSlimSubmission = ({id, date, language, verdict, time, memory, username, problem_slug, problem_title, contest_slug, contest_title, contest_problem_slug}: RichSubmission) => ({
    id,
    date,
    language,
    verdict,
    time,
    memory,
    username,
    problem_slug,
    problem_title,
    contest_slug,
    contest_title,
    contest_problem_slug,
});

export const toPublicSubmission = (richSubmission: RichSubmission): Partial<PublicSubmission> => ({
    ...toSlimSubmission(richSubmission),
    source_code: richSubmission.source_code,
    testcases: richSubmission.testcases,
});
