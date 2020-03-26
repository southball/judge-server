import {NextFunction, Request, Response, Router} from 'express';
import {Err} from '../json';
import {AppState} from '../app-state';
import {Submission} from '../models';
import {bodySingleTransformerMiddleware} from '../validation';
import {authUserMiddleware} from '../auth';

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

    // TODO check user can access contest, otherwise throw not found

    req.submission = result.rows[0] as Submission;

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
