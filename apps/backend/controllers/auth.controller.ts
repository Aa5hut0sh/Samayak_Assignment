import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import z from "zod";
import { prisma, Role } from "@repo/db/client";


const JWT_SECRET = process.env.JWT_SECRET || "secret";


const adminRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string(),
  adminSecret: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = adminRegisterSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, errors: parse.error.issues });
    }

    const { email, password, name, adminSecret } = parse.data;

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ success: false, message: "Invalid admin secret" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        role: Role.ADMIN,
        },
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ success: true, message: "Admin registered successfully", token });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, errors: parse.error.issues });
    }

    const { email, password } = parse.data;

    const user = await prisma.user.findUnique({ where: { email, deletedAt: null } });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

    const { passwordHash, ...userWithoutPassword } = user;

    res.status(200).json({ success: true, message: "Login successful", token, user: userWithoutPassword });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response) =>{
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        createdAt: true,
      } 
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};