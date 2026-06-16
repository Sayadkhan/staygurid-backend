import { TErrorSources, TGenericErrorResponse } from "../types/error";

export const handleDuplicateError = (err: Error): TGenericErrorResponse => {
  // Example error message:
  // E11000 duplicate key error collection: users index: email_1 dup key: { email: "example@mail.com" }

  const match = err.message.match(/dup key: { (.*): "([^"]*)" }/);

  const path = match?.[1] || "unknown_field";
  const value = match?.[2] || "unknown_value";

  const errorSources: TErrorSources = [
    {
      path,
      message: `${value} already exists for ${path}`,
    },
  ];

  const statusCode = 400;
  return {
    statusCode,
    message: "Duplicate Key Error",
    errorSources,
  };
};
