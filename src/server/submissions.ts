import {NextFunction, Request, Response, Router} from 'express';
import {Err} from '../json';

export function submissionsRouter(): Router {
    const router = Router();

    router.param('submission_id', fetchSubmission);

    router.get('/submission/:submission_id', getSubmission);
    router.put('/submission/:submission_id/judge', updateSubmissionJudge);

    return router;
}

/**
 * Set `req.submission` to the submission with `id` equal to `submission_id` if found, and errs otherwise.
 */
function fetchSubmission(req: Request, res: Response, next: NextFunction, submission_id: string): void {
    // TODO complete function
    next();
}

async function getSubmission(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function updateSubmissionJudge(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }

export default submissionsRouter;
