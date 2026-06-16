import express from "express";
import { AuthControllers } from "./auth.controller";
import { auth } from "../../middlewares/auth";
import { USER_ROLE } from "../users/user.const";

const router = express.Router();

router.post("/sign-up", AuthControllers.signUp);
router.post("/sign-up-google", AuthControllers.signUpWithGoogle);
router.post("/login", AuthControllers.loginUser);
router.post("/google-login", AuthControllers.loginUserWithGoogle);
router.post("/refresh-token", AuthControllers.refreshToken);
router.post("/verify-refresh-token", AuthControllers.verifyRefreshToken);
router.post(
  "/change-password",
  auth(USER_ROLE.admin, USER_ROLE.client),
  AuthControllers.changePassword
);
router.post("/forget-password", AuthControllers.forgetPassword);
router.post("/reset-password", AuthControllers.resetPassword);
router.post("/logout", AuthControllers.logoutUser);

export const AuthRoutes = router;
