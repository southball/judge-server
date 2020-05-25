import {
  ClassType,
  transformAndValidate,
  TransformValidationOptions,
} from 'class-transformer-validator';
import { NextFunction, Request, Response } from 'express';
import { Err } from './json';

export const TRANSFORM_VALIDATION_OPTIONS: TransformValidationOptions = {
  validator: {
    validationError: {
      target: false,
      value: false,
    },
    whitelist: false,
    forbidNonWhitelisted: false,
    forbidUnknownValues: false,
  },
  transformer: {
    excludeExtraneousValues: false,
  },
};

export const bodySingleTransformerMiddleware = <T extends object>(
  targetClass: ClassType<T>
) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (Array.isArray(req.body))
      throw new Error('Cannot use array as payload to this endpoint.');
    req.body = await transformAndValidate(
      targetClass,
      req.body,
      TRANSFORM_VALIDATION_OPTIONS
    );
    next();
  } catch (errors) {
    res.status(400).json(Err('Invalid payload.', errors));
  }
};

export const querySingleTransformerMiddleware = <T extends object>(
  targetClass: ClassType<T>
) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log(req.query);
  try {
    if (Array.isArray(req.query))
      throw new Error('Cannot use array as payload to this endpoint.');
    req.queryBody = await transformAndValidate(
      targetClass,
      req.query,
      TRANSFORM_VALIDATION_OPTIONS
    );
    next();
  } catch (errors) {
    res.status(400).json(Err('Invalid payload.', errors));
  }
};
