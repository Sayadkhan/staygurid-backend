import { USER_ROLE } from "./user.const";

export type TUser = {
  email: string;
  password: string;
  isDeleted: boolean;
  status: "blocked" | "active";
  passwordChangedAt?: Date;
  role: "client" | "admin" | "agent";
};

export type TUserRole = keyof typeof USER_ROLE;
