import express from "express";
import { UserController } from "./user.controller";
import { auth } from "../../middlewares/auth";
import { USER_ROLE } from "./user.const";

const router = express.Router();

router.get(
  "/get-me",
  auth(USER_ROLE.admin, USER_ROLE.client),
  UserController.getMe
);
router.post(
  "/update-me",
  auth(USER_ROLE.admin, USER_ROLE.client),
  UserController.updateMe
);
router.get("/all-users", auth(USER_ROLE.admin), UserController.getAllUsers);
router.get("/:id", auth(USER_ROLE.admin), UserController.getSingleUser);

export const UserROutes = router;
