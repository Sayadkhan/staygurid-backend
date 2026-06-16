import { model, Schema } from "mongoose";
import { TUser } from "./user.interface";
import bcrypt from "bcrypt";
import config from "../../config";

export const UserSchema = new Schema<TUser>({
  email: { type: String, unique: true, required: true },
  isDeleted: { type: Boolean, default: false },
  password: { type: String },
  role: { type: String, required: true },
  status: { type: String, enum: ["blocked", "active"], default: "active" },
});

UserSchema.pre("save", async function (next) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const user = this;

  user.password = await bcrypt.hash(
    user.password,
    Number(config.bcrypt_salt_round)
  );
  next();
});

export const UserModel = model<TUser>("User", UserSchema);
