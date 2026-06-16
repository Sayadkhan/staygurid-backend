import { NextFunction, Request, Response } from "express";
import { ZodObject } from "zod";

export const validateRequest = (schema: ZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body, req.cookies);
      next();
    } catch (error) {
      next(error);
    }
  };
};
