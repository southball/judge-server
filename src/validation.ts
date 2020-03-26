import {NextFunction, Request, Response} from 'express';
import {TransformValidationOptions, transformAndValidate} from 'class-transformer-validator'
import {Err} from './json';

export const TRANSFORM_VALIDATION_OPTIONS: TransformValidationOptions = {
    validator: {
        validationError: {
            target: false,
            value: false,
        },
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
    },
    transformer: {
        excludeExtraneousValues: false,
    },
};

export const bodySingleTransformerMiddleware = (targetClass: any) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (Array.isArray(req.body))
                throw new Error('Cannot use array as payload to this endpoint.');
            req.body = await transformAndValidate(targetClass, req.body, TRANSFORM_VALIDATION_OPTIONS);
            next();
        } catch (errors) {
            res.status(400).json(Err('Invalid payload.', errors));
        }
    };
