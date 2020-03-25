import {Router} from 'express';

export function authRouter(): Router {
    const router = Router();

    router.post('/register', () => {});
    router.post('/login', () => {});
    router.post('/refresh', () => {});

    return router;
}

export default authRouter;
