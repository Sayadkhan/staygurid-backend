import { ZodError } from "zod";
import { TGenericErrorResponse } from "../types/error";

export const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorSources = err.issues.map((issue) => {
    const lastPath = issue?.path[issue.path.length - 1];
    return {
      path:
        typeof lastPath === "string" || typeof lastPath === "number"
          ? lastPath
          : String(lastPath),
      message: issue.message,
    };
  });
  const statusCode = 400;
  return {
    statusCode,
    message: "Validation error",
    errorSources: errorSources,
  };
};
