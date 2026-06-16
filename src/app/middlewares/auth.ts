import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import status from "http-status";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../config";
import { TUserRole } from "../modules/users/user.interface";
import { UserModel } from "../modules/users/user.model";

export const auth = (...requiredRoles: TUserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;

      // if the token is sent from client
      if (!token) {
        throw new AppError(status.UNAUTHORIZED, "You are not authorized");
      }

      // check if the token is valid

      const decoded = jwt.verify(
        token,
        config.jwt_access_secret as string
      ) as JwtPayload;

      const { email, role, iat } = decoded;

      if (!iat) {
        throw new AppError(status.UNAUTHORIZED, "Invalid token");
      }

      const isUserExists = await UserModel.findOne({ email }).select(
        "+password"
      );

      if (!isUserExists) {
        throw new AppError(status.NOT_FOUND, "User not found");
      }

      const isUserDeleted = isUserExists.isDeleted;
      if (isUserDeleted) {
        throw new AppError(status.NOT_FOUND, "User is deleted");
      }

      const passwordChangedTime = isUserExists?.passwordChangedAt
        ? new Date(isUserExists.passwordChangedAt).getTime() / 1000
        : 0;

      if (passwordChangedTime > iat) {
        throw new AppError(
          status.UNAUTHORIZED,
          "Password was changed. Please login again"
        );
      }

      const isUserBlocked = isUserExists?.status === "blocked";
      if (isUserBlocked) {
        throw new AppError(status.FORBIDDEN, "User is blocked");
      }

      if (requiredRoles && !requiredRoles.includes(role)) {
        throw new AppError(status.UNAUTHORIZED, "You are not authorized");
      }

      req.user = decoded as JwtPayload;
      next();
    } catch (error) {
      next(error);
    }
  };
};
