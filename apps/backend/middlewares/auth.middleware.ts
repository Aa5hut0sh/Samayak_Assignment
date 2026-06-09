import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@repo/db/client";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

interface JwtPayload {
  userId: string;
  role: Role;
}



export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if(!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    req.userId = decoded.userId;
    req.role = decoded.role;

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
  }
};


export const authorize = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden: You do not have the required permissions" 
      });
    }
    next();
  };
};