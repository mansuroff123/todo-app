import cron from "node-cron";
import prisma from "./prisma.js";
import { sendNotification } from "./telegram.js";

/**
 * Flag to prevent overlapping executions.
 * If the previous task is still running, we skip the current minute.
 */
let isRunning = false;

export const initCron = () => {
  // Har daqiqada bir marta ishga tushadi (* * * * *)
  cron.schedule("* * * * *", async () => {
    if (isRunning) {
      console.warn("[NODE-CRON] Previous task is still running, skipping this minute...");
      return;
    }

    isRunning = true;
    console.log(`[NODE-CRON] Started checking reminders at: ${new Date().toISOString()}`);

    try {
      const now = new Date();

      // 1. Bazadan eslatma vaqti kelgan todo'larni olish
      const reminders = await prisma.todo.findMany({
        where: {
          remindAt: { lte: now },
          isCompleted: false,
          owner: { telegramChatId: { not: null } },
        },
        include: { owner: true },
      });

      if (reminders.length === 0) {
        return;
      }

      // 2. Barcha eslatmalarni parallel ravishda qayta ishlash
      // Promise.allSettled ishlatamizki, bitta xato boshqalarini to'xtatib qo'ymasin
      await Promise.allSettled(
        reminders.map(async (todo) => {
          try {
            // Telegramga xabar yuborish
            await sendNotification(
              todo.owner.telegramChatId!,
              `⏰ **Reminder**: "${todo.title}"\n\nIt's time to complete this task!`
            );

            let nextDate: Date | null = null;

            // 3. Takrorlanuvchi vazifalar uchun keyingi vaqtni hisoblash
            if (todo.isRepeatable && todo.frequency) {
              nextDate = new Date(todo.remindAt!);
              
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
                default:
                  nextDate = null;
              }
            }

            // 4. Bazada vaqtni yangilash yoki tozalash
            await prisma.todo.update({
              where: { id: todo.id },
              data: { remindAt: nextDate },
            });

          } catch (taskError) {
            console.error(`[NODE-CRON] Error processing Todo ID ${todo.id}:`, taskError);
          }
        })
      );

      console.log(`[NODE-CRON] Successfully processed ${reminders.length} reminders.`);
    } catch (error) {
      console.error("[NODE-CRON] Critical Error:", error);
    } finally {
      // Har qanday holatda ham flagni false qilamiz
      isRunning = false;
    }
  });
};