import { Types } from "mongoose";
import { TName } from "../../types/index.type";

export type TClient = {
  user: Types.ObjectId;
  image?: string;
  name: TName;
  age?: string;
  gender?: "male" | "female" | "other";
  email: string;
  password: string;
};
