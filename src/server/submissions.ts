import {NextFunction, Request, Response, Router} from 'express';
import {Err} from '../json';
import {AppState} from '../app-state';
import {Contest, Submission} from '../models';
import {bodySingleTransformerMiddleware} from '../validation';
import {authUserMiddleware, userIsAdmin} from '../auth';

export function submissionsRouter(): Router {
    const router = Router();

    router.param('submission_id', fetchSubmission);

    router.get('/submission/:submission_id', getSubmission);
    router.put('/submission/:submission_id/judge', updateSubmissionJudge);
    router.post('/submit', authUserMiddleware, bodySingleTransformerMiddleware(SubmitProps), submit);

    return router;
}

/**
 * Set `req.submission` to the submission with `id` equal to `submission_id` if found, and errs otherwise.
 */
async function fetchSubmission(req: Request, res: Response, next: NextFunction, submission_id: string): Promise<void> {
    const {pool} = AppState.get();

    const result = await pool.query(
            `SELECT *
             FROM Submissions
             WHERE id = $1`,
        [submission_id],
    );

    if (result.rowCount === 0) {
        res.json(Err('Submission not found!'));
        return;
    }

    const submission = result.rows[0] as Submission;

    if (!userIsAdmin(req.user) && submission.user_id !== req.user?.id) {
        // Check whether user can access the submission
        let accessible: boolean = false;

        if (submission.contest_id !== null) {
            const result = await pool.query(
                `SELECT * FROM Contests WHERE id=$1`,
                [submission.contest_id],
            );
            const contest = result.rows[0] as Contest;
            const now = new Date();

            if (contest.is_public && now > contest.end_time) {
                accessible = true;
            }

            // TODO allow access if user can access contest and contest is over

        }


    }

    req.submission = submission;

    next();
}

async function getSubmission(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

async function updateSubmissionJudge(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

class SubmitProps {

}

async function submit(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

export default submissionsRouter;
