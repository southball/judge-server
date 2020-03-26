import {NextFunction, Request, Response} from 'express';

const authMiddleware = (permission?: string) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // TODO implement middleware
        next();
    };
