import {NextFunction, Request, Response, Router} from 'express';
import {Err} from '../json';

export function contestsRouter(): Router {
    const router = Router();

    router.get('/contests', getContests);
    router.post('/contest', createContest);

    router.param('contest_slug', fetchContestFromSlug);

    router.get('/contest/:contest_slug', getContest);
    router.put('/contest/:contest_slug', editContest);
    router.delete('/contest/:contest_slug', deleteContest);

    router.post('/contest/:contest_slug/submit', submitToContest);
    router.get('/contest/:contest_slug/scoreboard', getContestScoreboard);

    return router;
}

/**
 * Set `req.contest` to the contest with `id` equal to `contest_slug` if found, and errs otherwise.
 */
function fetchContestFromSlug(req: Request, res: Response, next: NextFunction, contest_slug: string): void {
    // TODO complete function
    next();
}

async function getContests(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function createContest(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function getContest(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function editContest(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function deleteContest(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function submitToContest(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function getContestScoreboard(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }

export default contestsRouter;
