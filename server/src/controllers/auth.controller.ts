import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

const registerSchema = z.object({
  email: z
    .string()
    .email("Email formati noto'g'ri")
    .toLowerCase()
    .trim(),
    
  password: z
    .string()
    .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak")
    .max(32, "Parol juda uzun")
    .regex(/[A-Z]/, "Parolda kamida bitta katta harf bo'lishi kerak")
    .regex(/[0-9]/, "Parolda kamida bitta raqam bo'lishi kerak")
    .regex(/[^A-Za-z0-9]/, "Parolda kamida bitta maxsus belgi bo'lishi kerak (@, !, #, etc)"),

  fullName: z
    .string()
    .min(3, "Ism-familiya juda qisqa")
    .max(50)
    .optional(),

  telegramChatId: z
    .string()
    .regex(/^\d+$/, "Telegram ID faqat raqamlardan iborat bo'lishi kerak")
    .optional(),
});

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    const createInput = {
      email: validatedData.email,
      password: hashedPassword,
      fullName: validatedData.fullName,
      telegramChatId: validatedData.telegramChatId,
    } as Prisma.UserCreateInput;

    const user = await prisma.user.create({
      data: createInput,
      select: { 
        id: true, 
        email: true, 
        fullName: true,
        telegramChatId: true 
      }
    });

    res.status(201).json(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.flatten().fieldErrors });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ message: "Bu email allaqachon ro'yxatdan o'tgan" });
    }
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email va parolni kiriting" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Email yoki parol xato" });
    }

    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET || 'secret_key_123', 
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { id: user.id, email: user.email, fullName: user.fullName } 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};