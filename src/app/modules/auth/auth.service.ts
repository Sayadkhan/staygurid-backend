import status from "http-status";
import { AppError } from "../../errors/AppError";
import { TAuth } from "./auth.interface";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../../config";
import { SendEmail } from "../../utils/sendEmail";
import { UserModel } from "../users/user.model";
import { TClient } from "../client/client.interface";
import { ClientModel } from "../client/client.model";
import { TUser } from "../users/user.interface";
import mongoose from "mongoose";

const signUp = async (payload: TClient) => {
  const userData: Partial<TUser> = {};
  userData.email = payload.email;
  userData.password = payload.password;
  userData.role = "client";

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const newUser = await UserModel.create([userData], { session });

    if (!newUser.length) {
      throw new AppError(status.BAD_REQUEST, "Failed to create user");
    }

    payload.user = newUser[0]._id;

    const newClient = await ClientModel.create([payload], { session });

    if (!newClient.length) {
      throw new AppError(status.BAD_REQUEST, "Failed to create user");
    }

    await session.commitTransaction();
    await session.endSession();

    return newClient;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();

    throw error;
  }
};

const signUpWithGoogle = async (payload: { name: string; email: string }) => {
  const nameParts: string[] = payload.name.split(" ");
  let firstName: string = "";
  let middleName: string = "";
  let lastName: string = "";

  if (nameParts.length === 1) {
    firstName = nameParts[0];
  } else if (nameParts.length === 2) {
    firstName = nameParts[0];
    lastName = nameParts[1];
  } else if (nameParts.length >= 3) {
    firstName = nameParts[0];
    lastName = nameParts[nameParts.length - 1];
    middleName = nameParts.slice(1, nameParts.length - 1).join(" ");
  }

  const name = {
    firstName: firstName.trim(),
    middleName: middleName.trim(),
    lastName: lastName.trim(),
  };

  const clientData: Partial<TClient> = {};
  const userData: Partial<TUser> = {};

  userData.email = payload.email;
  userData.role = "client";
  userData.password = "stayway";

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const newUser = await UserModel.create([userData], { session });

    if (!newUser.length) {
      throw new AppError(status.BAD_REQUEST, "Failed to create user");
    }

    clientData.user = newUser[0]._id;
    clientData.name = name;
    clientData.email = payload.email;

    const newClient = await ClientModel.create([clientData], { session });

    if (!newClient.length) {
      throw new AppError(status.BAD_REQUEST, "Failed to create user");
    }

    await session.commitTransaction();
    await session.endSession();

    return newClient;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();

    throw error;
  }
};

const loginUserWithGoogle = async (payload: TAuth) => {
  const isUserExists = await UserModel.findOne({ email: payload.email }).select(
    "+password"
  );

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const isUserDeleted = isUserExists.isDeleted;
  if (isUserDeleted) {
    throw new AppError(status.NOT_FOUND, "User is deleted");
  }

  const isUserBlocked = isUserExists?.status === "blocked";
  if (isUserBlocked) {
    throw new AppError(status.FORBIDDEN, "User is blocked");
  }

  const jwtPayload = {
    email: isUserExists.email,
    role: isUserExists.role,
  };

  const accessToken = jwt.sign(jwtPayload, config.jwt_access_secret as string, {
    expiresIn: "10d",
  });
  const refreshToken = jwt.sign(
    jwtPayload,
    config.jwt_refresh_secret as string,
    {
      expiresIn: "365d",
    }
  );

  return {
    accessToken,
    refreshToken,
  };
};
const loginUser = async (payload: TAuth) => {
  const isUserExists = await UserModel.findOne({ email: payload.email }).select(
    "+password"
  );

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const isUserDeleted = isUserExists.isDeleted;
  if (isUserDeleted) {
    throw new AppError(status.NOT_FOUND, "User is deleted");
  }

  const isUserBlocked = isUserExists?.status === "blocked";
  if (isUserBlocked) {
    throw new AppError(status.FORBIDDEN, "User is blocked");
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    isUserExists.password
  );

  if (!isPasswordMatched) {
    throw new AppError(status.UNAUTHORIZED, "Wrong password");
  }

  const jwtPayload = {
    email: isUserExists.email,
    role: isUserExists.role,
  };

  const accessToken = jwt.sign(jwtPayload, config.jwt_access_secret as string, {
    expiresIn: "10d",
  });
  const refreshToken = jwt.sign(
    jwtPayload,
    config.jwt_refresh_secret as string,
    {
      expiresIn: "365d",
    }
  );

  return {
    accessToken,
    refreshToken,
  };
};

const changePassword = async (
  user: JwtPayload,
  payload: {
    oldPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }
) => {
  const isUserExists = await UserModel.findOne({ id: user.id }).select(
    "+password"
  );

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const isUserDeleted = isUserExists.isDeleted;
  if (isUserDeleted) {
    throw new AppError(status.NOT_FOUND, "User is deleted");
  }

  const isUserBlocked = isUserExists?.status === "blocked";
  if (isUserBlocked) {
    throw new AppError(status.FORBIDDEN, "User is blocked");
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.oldPassword,
    isUserExists.password
  );

  if (!isPasswordMatched) {
    throw new AppError(status.UNAUTHORIZED, "Wrong old password");
  }
  if (payload.newPassword !== payload.confirmNewPassword) {
    throw new AppError(status.UNAUTHORIZED, "New password does not match");
  }

  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_round)
  );

  await UserModel.findOneAndUpdate(
    {
      id: user.id,
      role: user.role,
    },
    {
      password: newHashedPassword,
      needsPasswordChanged: false,
      passwordChangedAt: new Date(),
    }
  );

  return null;
};

const refreshToken = async (token: string) => {
  // if the token is sent from client
  if (!token) {
    throw new AppError(status.UNAUTHORIZED, "You are not authorized");
  }

  // check if the token is valid

  const decoded = jwt.verify(
    token,
    config.jwt_refresh_secret as string
  ) as JwtPayload;

  const { email, iat } = decoded;

  if (!iat) {
    throw new AppError(status.UNAUTHORIZED, "Invalid token");
  }

  const isUserExists = await UserModel.findOne({ email }).select("+password");

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

  const jwtPayload = {
    email: isUserExists.email,
    role: isUserExists.role,
  };

  const accessToken = jwt.sign(jwtPayload, config.jwt_access_secret as string, {
    expiresIn: "10d",
  });

  return { accessToken };
};

const forgetPassword = async (id: string) => {
  const isUserExists = await UserModel.findOne({ id }).select("+password");

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const isUserDeleted = isUserExists.isDeleted;
  if (isUserDeleted) {
    throw new AppError(status.NOT_FOUND, "User is deleted");
  }

  const isUserBlocked = isUserExists?.status === "blocked";
  if (isUserBlocked) {
    throw new AppError(status.FORBIDDEN, "User is blocked");
  }

  const jwtPayload = {
    id: isUserExists.id,
    role: isUserExists.role,
  };

  const resetToken = jwt.sign(jwtPayload, config.jwt_access_secret as string, {
    expiresIn: "1h",
  });

  const resetUiLink = `http://localhost:3000/api/v1?id=${isUserExists.id}&token=${resetToken}`;

  SendEmail(isUserExists.email, resetUiLink);
};

const resetPassword = async (
  payload: { newPassword: string },
  token: string
) => {
  const decoded = jwt.verify(
    token,
    config.jwt_access_secret as string
  ) as JwtPayload;

  const isUserExists = await UserModel.findOne({ id: decoded.id }).select(
    "+password"
  );

  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const isUserDeleted = isUserExists.isDeleted;
  if (isUserDeleted) {
    throw new AppError(status.NOT_FOUND, "User is deleted");
  }

  const isUserBlocked = isUserExists?.status === "blocked";
  if (isUserBlocked) {
    throw new AppError(status.FORBIDDEN, "User is blocked");
  }

  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_round)
  );

  await UserModel.findOneAndUpdate(
    {
      id: decoded.id,
      role: decoded.role,
    },
    {
      password: newHashedPassword,
      needsPasswordChanged: false,
      passwordChangedAt: new Date(),
    }
  );
};

const verifyRefreshToken = async (token: string) => {
  if (!token) {
    throw new AppError(status.UNAUTHORIZED, "You are not authorized");
  }

  // check if the token is valid

  const decoded = jwt.verify(
    token,
    config.jwt_refresh_secret as string
  ) as JwtPayload;

  const { id, iat } = decoded;

  if (!iat) {
    throw new AppError(status.UNAUTHORIZED, "Invalid token");
  }

  const isUserExists = await UserModel.findOne({ id }).select("+password");

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
  return { status: status.OK };
};

export const AuthServices = {
  loginUser,
  changePassword,
  refreshToken,
  forgetPassword,
  resetPassword,
  verifyRefreshToken,
  signUp,
  signUpWithGoogle,
  loginUserWithGoogle,
};
