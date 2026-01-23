import cron from "node-cron";
import prisma from './prisma.js';
import { sendNotification } from "./telegram.js";

let isRunning = false;

export const initCron = () => {
  cron.schedule("* * * * *", async () => {
    if (isRunning) {
      console.warn("[NODE-CRON] Oldingi vazifa hali tugamagan, tashlab ketamiz...");
      return;
    }

    isRunning = true;
    const now = new Date();

    try {
      const reminders = await prisma.todo.findMany({
        where: {
          remindAt: { lte: now },
          isCompleted: false,
          isNotified: false,
          owner: { telegramId: { not: null } },
        },
        include: { owner: true },
      });

      if (reminders.length === 0) return;

      await Promise.allSettled(
        reminders.map(async (todo) => {
          try {
            const currentDay = now.getDay() === 0 ? 7 : now.getDay();
            
            if (todo.isRepeatable && todo.repeatDays) {
              const allowedDays = todo.repeatDays.split(',').map(Number);
              
              if (allowedDays.includes(currentDay)) {
                await sendNotification(
                  todo.owner.telegramId!,
                  `⏰ **Eslatma**: "${todo.title}"\n\nBugun bajarishingiz kerak bo'lgan vazifa vaqti keldi!`
                );
              }

              const nextDay = new Date(todo.remindAt!);
              nextDay.setDate(nextDay.getDate() + 1);

              await prisma.todo.update({
                where: { id: todo.id },
                data: { 
                  remindAt: nextDay,
                  isNotified: false 
                },
              });
            } 
            
            else {
              await sendNotification(
                todo.owner.telegramId!,
                `⏰ **Eslatma**: "${todo.title}"\n\nUshbu vazifani bajarish vaqti bo'ldi!`
              );

              await prisma.todo.update({
                where: { id: todo.id },
                data: { 
                  isNotified: true,
                },
              });
            }

          } catch (taskError) {
            console.error(`[NODE-CRON] Todo ID ${todo.id} xatosi:`, taskError);
          }
        })
      );
    } catch (error) {
      console.error("[NODE-CRON] Kritik xato:", error);
    } finally {
      isRunning = false;
    }
  });
};