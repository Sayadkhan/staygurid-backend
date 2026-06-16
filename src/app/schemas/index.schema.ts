import { Schema } from "mongoose";
import { TImage, TName } from "../types/index.type";

export const NameSchema = new Schema<TName>({
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
});

export const ImageSchema = new Schema<TImage>({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
});
