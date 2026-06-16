import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: "dpxdtcpft",
  api_key: "924279594715694",
  api_secret: "FPOOHGuACEAd5sgM3JJVv684dgw",
});

export const deleteFromCloudinary = async (publicId: string) => {
  return await cloudinary.uploader.destroy(publicId);
};
