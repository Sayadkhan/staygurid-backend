import status from "http-status";
import { AppError } from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import { UserServices } from "./user.service";
import { sendResponse } from "../../utils/sendResponse";

const getMe = catchAsync(async (req, res) => {
  const token = req.headers.authorization;

  if (!token) {
    throw new AppError(status.FORBIDDEN, "forbidden");
  }
  const result = await UserServices.getMe(token);

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "User retrived successfully",
    data: result,
  });
});
const updateMe = catchAsync(async (req, res) => {
  const token = req.headers.authorization;
  const data = req.body;

  if (!token) {
    throw new AppError(status.FORBIDDEN, "forbidden");
  }
  const result = await UserServices.upDateMe(token, data);

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "User retrived successfully",
    data: result,
  });
});
const getAllUsers = catchAsync(async (req, res) => {
  const result = await UserServices.getAllUsersFromDB();

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "Users retrived successfully",
    data: result,
  });
});
const getSingleUser = catchAsync(async (req, res) => {
  const result = await UserServices.getSingleUserDataFromDB(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "User retrived successfully",
    data: result,
  });
});

export const UserController = { getMe, getAllUsers, getSingleUser, updateMe };
