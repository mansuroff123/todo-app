import { Response, Request } from 'express';
import prisma from '../lib/prisma.js';
import { io } from '../index.js';
import { ShareStatus } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}


export const createTodo = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, remindAt, isRepeatable, repeatDays } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: "Ruxsat yo'q" });

    const todo = await prisma.todo.create({
      data: {
        title,
        description,
        isRepeatable: Boolean(isRepeatable),
        repeatDays: Array.isArray(repeatDays) ? repeatDays.join(',') : (repeatDays || null),
        remindAt: remindAt ? new Date(remindAt) : null,
        ownerId: userId,
        isNotified: false
      },
      include: {
        owner: { select: { id: true, fullName: true } }
      }
    });

    res.status(201).json(todo);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const getMyTodos = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Ruxsat yo'q" });

    const todos = await prisma.todo.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { shares: { some: { userId: userId, status: ShareStatus.ACCEPTED } } }
        ]
      },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        shares: {
          include: {
            user: { select: { id: true, fullName: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(todos);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const updateTodo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, isCompleted, remindAt, isRepeatable, repeatDays } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: "Ruxsat yo'q" });

    const todoId = Number(id);

    const existingTodo = await prisma.todo.findFirst({
      where: {
        id: todoId,
        OR: [
          { ownerId: userId },
          { shares: { some: { userId: userId, canEdit: true, status: ShareStatus.ACCEPTED } } }
        ]
      }
    });

    if (!existingTodo) return res.status(403).json({ message: "Ruxsat yo'q" });

    let finalIsCompleted = isCompleted !== undefined ? Boolean(isCompleted) : existingTodo.isCompleted;
    let finalRemindAt = remindAt !== undefined ? (remindAt ? new Date(remindAt) : null) : existingTodo.remindAt;
    
    const willBeRepeatable = isRepeatable !== undefined ? Boolean(isRepeatable) : existingTodo.isRepeatable;

    if (willBeRepeatable && isCompleted === true) {
      finalIsCompleted = false;
      
      if (finalRemindAt) {
        finalRemindAt = new Date(finalRemindAt);
        finalRemindAt.setDate(finalRemindAt.getDate() + 1);
      }
    }
    // ----------------------------

    const updatedTodo = await prisma.todo.update({
      where: { id: todoId },
      data: {
        title: title ?? existingTodo.title,
        description: description ?? existingTodo.description,
        isCompleted: finalIsCompleted,
        isRepeatable: willBeRepeatable,
        repeatDays: repeatDays !== undefined ? (Array.isArray(repeatDays) ? repeatDays.join(',') : repeatDays) : existingTodo.repeatDays,
        remindAt: finalRemindAt,
        isNotified: (remindAt !== undefined || (willBeRepeatable && isCompleted === true)) ? false : existingTodo.isNotified
      },
      include: {
        owner: { select: { id: true, fullName: true } }
      }
    });

    res.json(updatedTodo);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const shareTodoByEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { todoId, email, canEdit } = req.body;
    const currentUserId = req.user?.userId;

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

    const share = await prisma.share.upsert({
      where: { todoId_userId: { todoId: Number(todoId), userId: targetUser.id } },
      update: { canEdit: !!canEdit },
      create: {
        todoId: Number(todoId),
        userId: targetUser.id,
        canEdit: !!canEdit,
        status: ShareStatus.PENDING
      },
      include: { todo: true }
    });

    io.to(`user_${targetUser.id}`).emit('todo_shared', {
      message: `${req.user?.email} sizga vazifa yubordi`,
      todoId: share.todoId
    });

    res.json({ message: "Taklif yuborildi", share });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const generateInviteLink = async (req: AuthRequest, res: Response) => {
  try {
    const todoId = Number(req.params.id);
    const userId = req.user?.userId;

    const todo = await prisma.todo.findUnique({ where: { id: todoId } });
    if (!todo || todo.ownerId !== userId) return res.status(403).json({ message: "Ruxsat yo'q" });

    const existing = await prisma.todoInvite.findFirst({ where: { todoId } });
    if (existing) return res.json({ token: existing.token });

    const shortToken = Math.random().toString(36).substring(2, 8).toUpperCase();

    const invite = await prisma.todoInvite.create({
      data: { todoId, token: shortToken, maxUses: 99999 }
    });

    res.json({ token: invite.token });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


export const acceptInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: "Ruxsat yo'q" });

    const invite = await prisma.todoInvite.findUnique({ 
      where: { token: String(token) }
    });

    if (!invite || invite.usedCount >= invite.maxUses) {
      return res.status(400).json({ message: "Link yaroqsiz yoki ishlatish soni tugagan" });
    }

    // 3. Upsert mantiqi
    await prisma.share.upsert({
      where: { 
        todoId_userId: { todoId: invite.todoId, userId: userId } 
      },
      update: { status: ShareStatus.ACCEPTED },
      create: {
        todoId: invite.todoId,
        userId: userId,
        status: ShareStatus.ACCEPTED,
        canEdit: false
      }
    });

    await prisma.todoInvite.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } }
    });

    res.json({ message: "Qo'shildingiz", todoId: invite.todoId });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTodo = async (req: AuthRequest, res: Response) => {
  try {
    const todoId = Number(req.params.id);
    const userId = req.user?.userId;

    const todo = await prisma.todo.findUnique({ where: { id: todoId } });
    if (!todo || todo.ownerId !== userId) return res.status(403).json({ message: "Ruxsat yo'q" });

    await prisma.todo.delete({ where: { id: todoId } });
    res.json({ message: "Vazifa o'chirildi" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};