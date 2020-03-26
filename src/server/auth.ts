import {Request, Response, Router} from 'express';
import {Err} from "../json";

export function authRouter(): Router {
    const router = Router();

    router.post('/auth/register', register);
    router.post('/auth/login', login);
    router.post('/auth/refresh', refresh);

    return router;
}

async function register(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function login(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }
async function refresh(req: Request, res: Response): Promise<void> { res.json(Err('Not yet implemented!')); }

export default authRouter;
