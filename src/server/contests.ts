import {Request, Response, Router} from 'express';
import {Err} from '../json';

export function contestsRouter(): Router {
    const router = Router();

    router.get('/contests', getContests);
    router.post('/contest', createContest);

    router.param('contest_id', fetchContest);

    router.get('/contest/:contest_id', getContest);
    router.put('/contest/:contest_id', editContest);
    router.delete('/contest/:contest_id', deleteContest);

    router.post('/contest/:contest_id/submit', submitToContest);
    router.get('/contest/:contest_id/scoreboard', getContestScoreboard);

    return router;
}

/**
 * Set `req.contest` to the contest with `id` equal to `contest_id` if found, and `null` otherwise.
 */
function fetchContest(req: Request, res: Response, next: (err?: any) => void, contest_id: string): void{
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
