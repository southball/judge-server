import {NextFunction, Request, Response, Router} from 'express';
import {Err, Ok} from '../json';
import {authAdminMiddleware, authUserMiddleware, Permissions} from '../auth';
import {AppState} from "../app-state";
import {Contest} from "../models";
import {bodySingleTransformerMiddleware} from "../validation";

export function contestsRouter(): Router {
    const router = Router();

    router.get('/contests', getContests);
    router.post('/contest',
        authAdminMiddleware,
        bodySingleTransformerMiddleware(CreateContestProps),
        createContest);

    router.param('contest_slug', fetchContestFromSlug);

    router.get('/contest/:contest_slug', getContest);
    router.put('/contest/:contest_slug',
        authAdminMiddleware,
        bodySingleTransformerMiddleware(EditContestProps),
        editContest);
    router.delete('/contest/:contest_slug',
        authAdminMiddleware,
        deleteContest);

    router.post('/contest/:contest_slug/submit',
        authUserMiddleware,
        bodySingleTransformerMiddleware(SubmitToContestProps),
        submitToContest);
    router.get('/contest/:contest_slug/scoreboard', getContestScoreboard);

    return router;
}

/**
 * Set `req.contest` to the contest with `id` equal to `contest_slug` if found, and errs otherwise.
 */
async function fetchContestFromSlug(req: Request, res: Response, next: NextFunction, contest_slug: string): Promise<void> {
    const {pool} = AppState.get();

    const result = await pool.query(
            `SELECT *
             FROM Contests
             WHERE slug = $1`,
        [contest_slug],
    );

    if (result.rowCount === 0) {
        res.json(Err('Contest not found.'));
        return;
    }

    // TODO check user can access contest, otherwise throw not found

    req.contest = result.rows[0] as Contest;

    next();
}

async function getContests(req: Request, res: Response): Promise<void> {

}

class CreateContestProps {

}

async function createContest(req: Request, res: Response): Promise<void> {

}

async function getContest(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

class EditContestProps {
}

async function editContest(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

async function deleteContest(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

class SubmitToContestProps {
}

async function submitToContest(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

async function getContestScoreboard(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

export default contestsRouter;
