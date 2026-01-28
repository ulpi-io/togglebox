import { Request, Response, NextFunction } from "express";
import type { UserContext } from "../types";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userContext?: UserContext;
    }
  }
}

/**
 * Middleware to extract user context from headers
 *
 * Headers:
 *   X-User-Id: Required user identifier
 *   X-Country: Optional ISO-3166 country code (e.g., US, GB)
 *   X-Language: Optional ISO-639 language code (e.g., en, es)
 */
export function userContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const userId = req.headers["x-user-id"] as string;
  const country = req.headers["x-country"] as string | undefined;
  const language = req.headers["x-language"] as string | undefined;

  if (!userId) {
    res.status(400).json({
      error: "Missing X-User-Id header",
      hint: "Add X-User-Id header with a unique user identifier",
    });
    return;
  }

  req.userContext = {
    userId,
    ...(country && { country }),
    ...(language && { language }),
  };

  next();
}
