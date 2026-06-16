import { model, Schema } from "mongoose";
import { TClient } from "./client.interface";
import { NameSchema } from "../../schemas/index.schema";

export const ClientSchema = new Schema<TClient>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  image: { type: String },
  email: { type: String, unique: true },
  name: { type: NameSchema,  required: true },
  age: { type: String },
  gender: { type: String, enum: ["male", "female", "other"] },
});

export const ClientModel = model<TClient>("Client", ClientSchema);
