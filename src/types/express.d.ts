import type { AppJwtPayload } from "../utils/TokenUtils.ts";

declare global {
  namespace Express {
    interface Request {
      user?: AppJwtPayload;
    }
  }
}
