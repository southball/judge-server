import {Request, Response} from 'express';

const authMiddleware = (permission?: string) =>
    async (req: Request, res: Response, next: (err?: any) => void): Promise<void> => {
        // TODO implement middleware
        next();
    };
