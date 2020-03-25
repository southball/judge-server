import {Contest, ContestProblem, Problem, Submission, User} from './models';

declare module 'express-serve-static-core' {
    export interface Request {
        contest?: Contest;
        contestProblem?: ContestProblem;
        problem?: Problem;
        submission?: Submission;
        user?: User;
    }
}
