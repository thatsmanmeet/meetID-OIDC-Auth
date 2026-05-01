import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { AuthMiddleware } from "./middlewares/auth.middleware.js";
import authRouter from "./modules/Auth/auth.routes.js";
import applicationRouter from "./modules/Application/application.routes.js";
import userRouter from "./modules/User/user.routes.js";
import APIError from "./utils/APIError.js";
import { env } from "./env.js";

function createExpressApplication(): Express {
  const app = express();

  // express middlewares + other important middlewares
  app.use(express.json({ limit: "50kb" }));
  app.use(express.urlencoded({ extended: true, limit: "50kb" }));
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      allowedHeaders: ["Content-Type", "Authorization", "Connection"],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTION"],
    }),
  );
  app.use(helmet());
  app.use(cookieParser());
  app.use(AuthMiddleware());

  // route handlers
  app.get("/health", (req: Request, res: Response) => {
    return res.json({ status: "success", message: "Server is running" });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/application", applicationRouter);
  app.use("/api/v1/users", userRouter);

  // error middlewares
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof APIError) {
      return res.status(err.statusCode).json({
        success: err.success,
        statusCode: err.statusCode,
        message: err.message,
        stack: env.NODE_ENV === "development" ? err.stack : null,
        other: err.cause,
      });
    }
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      stack: env.NODE_ENV === "development" ? err.stack : null,
    });
  });

  return app;
}

export default createExpressApplication;
