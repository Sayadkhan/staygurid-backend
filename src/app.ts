"use strict";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import { golbalErrorHandler } from "./app/middlewares/globalErrorHandler";
import { notFound } from "./app/middlewares/notFound";
import router from "./app/routes";
import cookieParser from "cookie-parser";

const app: Application = express();

// parsers
app.use(express.json());
app.use(express.urlencoded());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",

    ],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(cookieParser());

// application routes
app.use("/api/v1", router);

app.get("/", (req: Request, res: Response) => {
  res.send("Server Is Running");
});

app.use(golbalErrorHandler);
app.use(notFound);

export default app;
