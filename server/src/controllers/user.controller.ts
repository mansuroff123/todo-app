// server/src/controllers/user.controller.ts
import { Response } from 'express';
import { AuthRequest } from './auth.controller.js'; // Interfeysni to'g'ri import qilish
import prisma from '../lib/prisma.js';


export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; 

    if (!userId) {
      return res.status(401).json({ message: "Ruxsat yo'q" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        fullName: true, 
        telegramId: true 
      }
    });

    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'todo_kh_bot';
    
    const connectLink = `https://t.me/${botUsername}?start=${user.id}`;

    res.json({ 
      ...user, 
      connectLink 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};