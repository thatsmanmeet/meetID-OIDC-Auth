import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../utils/TokenUtils.js";
import { cookieOptions } from "../../constants.js";

export interface FlashData {
  type: "success" | "error";
  message: string;
  secret?: string;
}

export function flashMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const raw = req.cookies._flash as string | undefined;
    if (raw) {
      try {
        res.locals.flash = JSON.parse(raw) as FlashData;
      } catch {
        res.locals.flash = null;
      }
      res.clearCookie("_flash");
    } else {
      res.locals.flash = null;
    }
    next();
  };
}

export function setFlash(res: Response, data: FlashData) {
  res.cookie("_flash", JSON.stringify(data), {
    maxAge: 15000,
    httpOnly: true,
    sameSite: "lax",
  });
}

export function requireAuth(redirectTo = "/login") {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken as string | undefined;
    if (!token) {
      const nextUrl = encodeURIComponent(req.originalUrl);
      return res.redirect(`${redirectTo}?next=${nextUrl}`);
    }
    try {
      const user = verifyToken("Access", token);
      res.locals.user = user;
      return next();
    } catch {
      res.clearCookie("accessToken", cookieOptions);
      const nextUrl = encodeURIComponent(req.originalUrl);
      return res.redirect(`${redirectTo}?next=${nextUrl}`);
    }
  };
}

export function requireGuest() {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken as string | undefined;
    if (!token) return next();
    try {
      verifyToken("Access", token);
      return res.redirect("/dashboard");
    } catch {
      res.clearCookie("accessToken", cookieOptions);
      return next();
    }
  };
}
