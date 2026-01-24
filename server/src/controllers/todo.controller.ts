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

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

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
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

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

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

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

    if (!existingTodo) return res.status(403).json({ message: "Unauthorized" });

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

    if (!currentUserId) return res.status(401).json({ message: "Ruxsat yo'q" });

    const todo = await prisma.todo.findUnique({
      where: { id: Number(todoId) }
    });

    if (!todo) return res.status(404).json({ message: "Vazifa topilmadi" });
    
    if (todo.ownerId !== currentUserId) {
      return res.status(403).json({ message: "Bu todo sizga tegishli emas! Uni share qila olmaysiz." });
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

    if (targetUser.id === currentUserId) {
      return res.status(400).json({ message: "O'zingizga o'zingiz taklif yubora olmaysiz" });
    }

    const share = await prisma.share.upsert({
      where: { 
        todoId_userId: { 
          todoId: Number(todoId), 
          userId: targetUser.id 
        } 
      },
      update: { 
        canEdit: !!canEdit,
        status: ShareStatus.PENDING 
      },
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
      todoId: share.todoId,
      ownerEmail: req.user?.email
    });

    res.json({ message: "Taklif muvaffaqiyatli yuborildi", share });
  } catch (error: any) {
    console.error("Share Email Error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const generateInviteLink = async (req: AuthRequest, res: Response) => {
  try {
    const todoId = Number(req.params.id);
    const userId = req.user?.userId;

    const todo = await prisma.todo.findUnique({ where: { id: todoId } });
    if (!todo || todo.ownerId !== userId) return res.status(403).json({ message: "Unauthorized" });

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

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const invite = await prisma.todoInvite.findUnique({ 
      where: { token: String(token) },
      include: { todo: true }
    });

    if (!invite) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invite.usedCount >= invite.maxUses) {
      return res.status(400).json({ message: "This link usage limit has been reached" });
    }

    if (invite.todo.ownerId === userId) {
      return res.status(400).json({ 
        message: "You are the owner of this task and cannot accept your own invitation." 
      });
    }

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

    res.json({ message: "Task added to your list!", todoId: invite.todoId });
    
  } catch (error: any) {
    console.error("Invite Accept Error:", error);
    res.status(500).json({ message: "Server error occurred" });
  }
};

export const deleteTodo = async (req: AuthRequest, res: Response) => {
  try {
    const todoId = Number(req.params.id);
    const userId = req.user?.userId;

    const todo = await prisma.todo.findUnique({ where: { id: todoId } });
    if (!todo || todo.ownerId !== userId) return res.status(403).json({ message: "Unauthorized" });

    await prisma.todo.delete({ where: { id: todoId } });
    res.json({ message: "Task deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
