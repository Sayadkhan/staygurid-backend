import status from "http-status";
import catchAsync from "../../utils/catchAsync";
import { AuthServices } from "./auth.service";
import { sendResponse } from "../../utils/sendResponse";
// import config from "../../config";

const signUp = catchAsync(async (req, res) => {
  const result = await AuthServices.signUp(req.body);

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "Sign up succesfull",
    data: result,
  });
});
const signUpWithGoogle = catchAsync(async (req, res) => {
  const result = await AuthServices.signUpWithGoogle(req.body);

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "Sign up succesfull",
    data: result,
  });
});
const loginUser = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUser(req.body);

  const { accessToken, refreshToken } = result;

  res.cookie("refreshToken", refreshToken, {
    path: "/",
    httpOnly: false,
    secure: true, // production HTTPS
    sameSite: "none",
  });
  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "User logged in succesfully",
    data: {
      accessToken,
    },
  });
});
const loginUserWithGoogle = catchAsync(async (req, res) => {
  const result = await AuthServices.loginUserWithGoogle(req.body);

  const { accessToken, refreshToken } = result;

  res.cookie("refreshToken", refreshToken, {
    path: "/",
    httpOnly: false,
    secure: true, // production HTTPS
    sameSite: "none",
  });
  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "User logged in succesfully",
    data: {
      accessToken,
    },
  });
});
const logoutUser = catchAsync(async (req, res) => {
  res.clearCookie("refreshToken", {
    path: "/",
    httpOnly: false,
    secure: true, // production HTTPS
    sameSite: "none",
  });
  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "User logged out succesfully",
    data: null,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const result = await AuthServices.changePassword(req.user, req.body);

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "Password changed succesfully",
    data: result,
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;
  const result = await AuthServices.refreshToken(refreshToken);

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "Accesstoken is retrived successfully",
    data: result,
  });
});
const forgetPassword = catchAsync(async (req, res) => {
  const userId = req.body.id;
  const result = await AuthServices.forgetPassword(userId);
  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "Reset link is generated successfully",
    data: result,
  });
});
const resetPassword = catchAsync(async (req, res) => {
  const token = req.headers.authorization || "";

  const result = await AuthServices.resetPassword(req.body, token);
  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "Password has been reseted successfully",
    data: result,
  });
});

const verifyRefreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;

  const result = await AuthServices.verifyRefreshToken(refreshToken);
  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: "Password has been reseted successfully",
    data: result,
  });
});

export const AuthControllers = {
  loginUser,
  changePassword,
  refreshToken,
  forgetPassword,
  resetPassword,
  logoutUser,
  verifyRefreshToken,
  signUp,
  signUpWithGoogle,
  loginUserWithGoogle,
};
