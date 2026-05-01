import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/TokenUtils.js";
import APIError from "../utils/APIError.js";

export function AuthMiddleware() {
  return function (req: Request, res: Response, next: NextFunction) {
    // get the token from cookie or header
    if (!req.headers.authorization && !req.cookies.accessToken) {
      return next();
    }

    let token;

    if (req.headers.authorization) {
      const splitToken = req.headers.authorization.split("Bearer ")[1];
      if (!splitToken)
        throw APIError.BadRequest("Malformed Authorization header");
      token = splitToken;
    } else {
      token = req.cookies.accessToken;
    }

    // start decoding...

    const user = verifyToken("Access", token);

    if (!user) {
      throw APIError.BadRequest("Invalid Access Token found!");
    }

    req.user = user;
    next();
  };
}

export function RestrictToAuthenticatedUser() {
  return function (req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
      throw APIError.UnAuthorized("Unauthorized Request. Please login again");
    }
    return next();
  };
}
