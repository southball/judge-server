import {Request, Response, Router} from 'express';
import {Err} from '../json';

export function problemsRouter(): Router {
    const router = Router();

    router.get('/problems', getProblems);
    router.post('/problems', createProblem);

    router.param('problem_slug', fetchProblemBySlug);

    router.get('/problem/:problem_slug', getProblem);
    router.put('/problem/:problem_slug', editProblem);
    router.delete('/problem/:problem_slug', deleteProblem);

    router.get('/problem/:problem_slug/testcases', getTestcases);
    router.put('/problem/:problem_slug/testcases', updateTestcases);

    return router;
}

/**
 * Set `req.problem` to the problem with `slug` equal to `problem_slug` if found, and errs otherwise.
 */
function fetchProblemBySlug(req: Request, res: Response, next: (err?: any) => void, problem_slug: string): void {
    // TODO complete function
    next();
}

async function getProblems(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function createProblem(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function getProblem(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function editProblem(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function deleteProblem(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function getTestcases(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function updateTestcases(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }

export default problemsRouter;
