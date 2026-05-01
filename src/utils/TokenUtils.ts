import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../env.js";
import APIError from "./APIError.js";

const { TokenExpiredError } = jwt;
type TokenType = "Access" | "Refresh";

export type AppJwtPayload = JwtPayload & {
  id: string;
  email?: string;
  firstName?: string;
};

const getSecret = (tokenType: TokenType) => {
  return tokenType === "Access" ? env.ACCESS_TOKEN : env.REFRESH_TOKEN;
};

export const generateToken = (
  tokenType: TokenType,
  payload: { id: string; email?: string; firstName?: string },
) => {
  const expiryTime =
    tokenType === "Access" ? env.ACCESS_TOKEN_EXPIRY : env.REFRESH_TOKEN_EXPIRY;

  //! expiresIn expects StringValue | number, not undefined — NonNullable strips the undefined that env vars carry
  return jwt.sign(payload, getSecret(tokenType), {
    expiresIn: expiryTime as NonNullable<SignOptions["expiresIn"]>,
  });
};

export const verifyToken = (
  tokenType: TokenType,
  token: string,
): AppJwtPayload => {
  try {
    return jwt.verify(token, getSecret(tokenType)) as AppJwtPayload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw APIError.UnAuthorized("Token Expired!");
    }
    throw APIError.UnAuthorized("Invalid Token Found!");
  }
};
