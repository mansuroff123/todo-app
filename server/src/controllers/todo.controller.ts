import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma.js';
import { io } from '../index.js';

// 1. Yangi Todo yaratish
export const createTodo = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, remindAt } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Ruxsat yo'q" });
    }

    const todo = await prisma.todo.create({
      data: {
        title,
        description,
        remindAt: remindAt ? new Date(remindAt) : null,
        ownerId: userId
      }
    });

    res.status(201).json(todo);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Foydalanuvchining barcha Todo'larini olish
export const getMyTodos = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    // TypeScript xatosini oldini olish uchun qat'iy check
    if (typeof userId !== 'number') {
      return res.status(401).json({ message: "Ruxsat yo'q" });
    }

    const todos = await prisma.todo.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { shares: { some: { userId: userId } } } // 'sharedWith' o'rniga Prisma relation nomi
        ]
      },
      include: {
        owner: {
          select: { id: true, fullName: true, email: true }
        },
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

// 3. Todo statusini yangilash
export const updateTodoStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isCompleted } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: "Ruxsat yo'q" });

    const todoId = Number(id);

    // Faqat owner yoki share qilingan user statusni o'zgartira oladi
    const todo = await prisma.todo.update({
      where: { id: todoId },
      data: { isCompleted: Boolean(isCompleted) }
    });

    res.json(todo);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 4. Todo'ni boshqa foydalanuvchiga share qilish
export const shareTodo = async (req: AuthRequest, res: Response) => {
  try {
    const { todoId, targetUserId, canEdit } = req.body;
    const currentUserId = req.user?.userId;

    if (!currentUserId) return res.status(401).json({ message: "Ruxsat yo'q" });

    const tId = Number(todoId);
    const uId = Number(targetUserId);

    // 1. Allaqachon share qilinganmi?
    const existingShare = await prisma.share.findUnique({
      where: {
        todoId_userId: { todoId: tId, userId: uId }
      }
    });

    if (existingShare) {
      return res.status(400).json({ message: "Bu vazifa allaqachon ushbu foydalanuvchiga share qilingan" });
    }

    // 2. Share yaratish
    const share = await prisma.share.create({
      data: {
        todoId: tId,
        userId: uId,
        canEdit: !!canEdit,
        status: 'PENDING'
      },
      include: { todo: true }
    });

    // 3. Real-time xabar (WebSocket)
    io.to(`user_${uId}`).emit('todo_shared', {
      message: `Sizga yangi vazifa share qilindi: ${share.todo.title}`,
      todoId: share.todoId
    });

    res.status(200).json({ message: "Muvaffaqiyatli share qilindi", share });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 5. Todo'ni o'chirish
export const deleteTodo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const todoId = Number(id);

    const todo = await prisma.todo.findUnique({ where: { id: todoId } });

    if (!todo || todo.ownerId !== userId) {
      return res.status(403).json({ message: "O'chirishga ruxsat yo'q" });
    }

    await prisma.todo.delete({ where: { id: todoId } });
    res.json({ message: "Vazifa o'chirildi" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};