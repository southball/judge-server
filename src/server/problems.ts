import {NextFunction, Request, Response, Router} from 'express';
import {Err} from '../json';
import {AppState} from "../app-state";
import {Problem} from "../models";
import {authAdminMiddleware, authJudgeMiddleware} from "../auth";
import {bodySingleTransformerMiddleware} from "../validation";

export function problemsRouter(): Router {
    const router = Router();

    router.get('/problems', getProblems);
    router.post('/problems', authAdminMiddleware, bodySingleTransformerMiddleware(CreateProblemProps), createProblem);

    router.param('problem_slug', fetchProblemBySlug);

    router.get('/problem/:problem_slug', getProblem);
    router.put('/problem/:problem_slug', authAdminMiddleware, bodySingleTransformerMiddleware(EditProblemProps), editProblem);
    router.delete('/problem/:problem_slug', authAdminMiddleware, deleteProblem);

    router.get('/problem/:problem_slug/testcases', authJudgeMiddleware, getTestcases);
    router.put('/problem/:problem_slug/testcases', authAdminMiddleware, updateTestcases);

    return router;
}

/**
 * Set `req.problem` to the problem with `slug` equal to `problem_slug` if found, and errs otherwise.
 */
async function fetchProblemBySlug(req: Request, res: Response, next: NextFunction, problem_slug: string): Promise<void> {
    const {pool} = AppState.get();

    const result = await pool.query(
            `SELECT *
             FROM Problems
             WHERE slug = $1`,
        [problem_slug],
    );

    if (result.rowCount === 0) {
        res.json(Err('Problem not found.'));
        return;
    }

    // TODO check user can access problem, otherwise throw not found

    req.problem = result.rows[0] as Problem;

    next();
}

async function getProblems(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

class CreateProblemProps {
}

async function createProblem(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

async function getProblem(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

class EditProblemProps {
}

async function editProblem(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

async function deleteProblem(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

async function getTestcases(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

async function updateTestcases(req: Request, res: Response): Promise<void> {
    res.json(Err('Not yet implemented!'));
}

export default problemsRouter;
