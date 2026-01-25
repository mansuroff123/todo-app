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

const broadcastTodoUpdate = async (todoId: number, event: string, payload: any, senderId?: number) => {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: { shares: { where: { status: ShareStatus.ACCEPTED } } }
  });

  if (!todo) return;

  const recipients = new Set([todo.ownerId, ...todo.shares.map(s => s.userId)]);
  
  recipients.forEach(userId => {
    if (userId !== senderId) {
      io.to(`user_${userId}`).emit(event, payload);
    }
  });
};

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

    broadcastTodoUpdate(todoId, 'todo_updated', updatedTodo, userId);

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

    const todo = await prisma.todo.findUnique({ where: { id: Number(todoId) } });
    if (!todo) return res.status(404).json({ message: "Vazifa topilmadi" });
    if (todo.ownerId !== currentUserId) return res.status(403).json({ message: "Ruxsat yo'q" });

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

    const share = await prisma.share.upsert({
      where: { todoId_userId: { todoId: Number(todoId), userId: targetUser.id } },
      update: { canEdit: !!canEdit, status: ShareStatus.PENDING },
      create: { todoId: Number(todoId), userId: targetUser.id, canEdit: !!canEdit, status: ShareStatus.PENDING },
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
    const { canEdit } = req.body;
    const userId = req.user?.userId;

    let invite = await prisma.todoInvite.findFirst({ where: { todoId } });

    if (invite) {
      if (typeof canEdit !== 'undefined') {
        invite = await prisma.todoInvite.update({
          where: { id: invite.id },
          data: { canEdit: Boolean(canEdit) }
        });

        await prisma.share.updateMany({
          where: { todoId },
          data: { canEdit: Boolean(canEdit) }
        });

        broadcastTodoUpdate(todoId, 'permission_updated', { todoId, canEdit: Boolean(canEdit) }, userId);
      }
    } else {
      invite = await prisma.todoInvite.create({
        data: {
          todoId,
          token: Math.random().toString(36).substring(2, 8).toUpperCase(),
          canEdit: Boolean(canEdit) || false
        }
      });
    }
    res.json({ token: invite.token, canEdit: invite.canEdit });
  } catch (error: any) {
    res.status(500).json({ message: "Server xatosi" });
  }
};

export const acceptInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const userId = req.user?.userId;

    const invite = await prisma.todoInvite.findUnique({ 
      where: { token: String(token) },
      include: { todo: { include: { owner: true } } }
    });

    if (!invite) return res.status(404).json({ message: "Link topilmadi" });

    const share = await prisma.share.upsert({
      where: { todoId_userId: { todoId: invite.todoId, userId: userId! } },
      update: { status: ShareStatus.ACCEPTED, canEdit: invite.canEdit },
      create: { todoId: invite.todoId, userId: userId!, status: ShareStatus.ACCEPTED, canEdit: invite.canEdit }
    });

    io.to(`user_${invite.todo.ownerId}`).emit('invite_accepted', {
      message: `${req.user?.email} qo'shildi`,
      todoId: invite.todoId
    });

    res.json({ message: "Muvaffaqiyatli", todoId: invite.todoId });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTodo = async (req: AuthRequest, res: Response) => {
  try {
    const todoId = Number(req.params.id);
    const userId = req.user?.userId;

    const todo = await prisma.todo.findUnique({ where: { id: todoId } });
    if (!todo || todo.ownerId !== userId) return res.status(403).json({ message: "Unauthorized" });

    await broadcastTodoUpdate(todoId, 'todo_deleted', { todoId }, userId);

    await prisma.todo.delete({ where: { id: todoId } });
    res.json({ message: "Task deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};