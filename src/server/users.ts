import {Request, Response, Router} from 'express';

export function usersRouter(): Router {
    const router = Router();

    router.param('username', fetchUser);

    router.get('/user/:user_id', getUser);

    return router;
}

async function fetchUser(req: Request, res: Response) {

}

async function getUser(req: Request, res: Response) {

}
