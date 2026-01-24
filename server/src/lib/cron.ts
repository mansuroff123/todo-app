import cron from "node-cron";
import prisma from "./prisma.js";
import { sendNotification } from "./telegram.js";

let isRunning = false;

export const initCron = () => {
  cron.schedule(
    "* * * * *",
    async () => {
      if (isRunning) return;

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
              if (!todo.remindAt) return;

              if (todo.isRepeatable && todo.repeatDays) {
                const currentDay = now.getDay() === 0 ? 7 : now.getDay();
                const allowedDays = todo.repeatDays.split(",").map(Number);

                if (allowedDays.includes(currentDay)) {
                  await sendNotification(
                    todo.owner.telegramId!,
                    `⏰ **Reminder**: "${todo.title}"\n${todo.description || ""}\n` +
                      `It's time to complete this task!`,
                  );
                }

                const nextDay = new Date(todo.remindAt);
                nextDay.setDate(nextDay.getDate() + 1);

                await prisma.todo.update({
                  where: { id: todo.id },
                  data: {
                    remindAt: nextDay,
                    isNotified: false,
                    isCompleted: false,
                  },
                });
              } else {
                await sendNotification(
                  todo.owner.telegramId!,
                  `⏰ **Reminder**: "${todo.title}"\n${todo.description || ""}\n` +
                    `It's time to complete this task!`,
                );

                await prisma.todo.update({
                  where: { id: todo.id },
                  data: { isNotified: true },
                });
              }
            } catch (taskError) {
              console.error(`[CRON ERROR] ID: ${todo.id}`, taskError);
            }
          }),
        );
      } catch (error) {
        console.error("[CRON CRITICAL]", error);
      } finally {
        isRunning = false;
      }
    },
    {
      timezone: "Asia/Tashkent",
    },
  );
};
