import {Contest, ContestProblem, Problem, RichSubmission, Submission, User} from './models';

declare module 'express-serve-static-core' {

    export interface Request {
        contest?: Contest;
        contestProblem?: ContestProblem;
        contestProblems?: ContestProblem[];
        problem?: Problem;
        submission?: Submission;
        richSubmission?: RichSubmission;
        user?: User;
        queryBody?: any;
    }
}
