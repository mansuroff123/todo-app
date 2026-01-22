import cron from "node-cron";
import prisma from "./prisma.js";
import { sendNotification } from "./telegram.js";

export const initCron = () => {
  // Har daqiqada bazani tekshiramiz
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      const reminders = await prisma.todo.findMany({
        where: {
          remindAt: { lte: now },
          isCompleted: false,
          owner: { telegramChatId: { not: null } },
        },
        include: { owner: true },
      });

      for (const todo of reminders) {
        if (todo.owner.telegramChatId) {
          // 1. Xabar yuborish
          await sendNotification(
            todo.owner.telegramChatId,
            `⏰ Eslatma: "${todo.title}" vazifasini bajarish vaqti keldi!`,
          );

          // 2. Kelajakni o'ylagan mantiq: Agar takrorlanuvchi bo'lsa, keyingi vaqtni hisoblash
          if (todo.isRepeatable && todo.frequency) {
            let nextDate = new Date(todo.remindAt!);

            switch (todo.frequency) {
              case "HOURLY":
                nextDate.setHours(nextDate.getHours() + 1);
                break;
              case "DAILY":
                nextDate.setDate(nextDate.getDate() + 1);
                break;
              case "WEEKLY":
                nextDate.setDate(nextDate.getDate() + 7);
                break;
              case "MONTHLY":
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            }

            // Bazada vaqtni yangilaymiz (kelasi safar yana xabar borishi uchun)
            await prisma.todo.update({
              where: { id: todo.id },
              data: { remindAt: nextDate },
            });
          } else {
            // Agar takrorlanmasa, qayta xabar bormasligi uchun remindAt ni tozalaymiz
            await prisma.todo.update({
              where: { id: todo.id },
              data: { remindAt: null },
            });
          }
        }
      }
    } catch (error) {
      console.error("Cron Error:", error);
    }
  });
};
