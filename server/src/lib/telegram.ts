import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import prisma from './prisma.js';
import { io } from '../index.js';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');


bot.start(async (ctx) => {
  const payload = ctx.startPayload;
  const chatId = ctx.chat.id.toString();

  if (!payload) {
    return ctx.reply(
      "Xush kelibsiz! Hisobingizni bog'lash uchun Todo ilovangizdagi 'Connect Telegram' tugmasini bosing."
    );
  }

  const userId = parseInt(payload);

  if (isNaN(userId)) {
    return ctx.reply("❌ Xatolik: Noto'g'ri havoladan foydalandingiz.");
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { telegramId: chatId },
      select: {
        id: true,
        fullName: true,
        email: true,
        telegramId: true
      }
    });


    io.to(`user_${userId}`).emit('telegram_connected', updatedUser);

    await ctx.reply(
      `✅ Tabriklaymiz, ${updatedUser.fullName}! 
Hozirgina hisobingiz muvaffaqiyatli bog'landi. 
Endi vazifalaringiz haqidagi eslatmalarni shu yerda qabul qilasiz.`
    );

    console.log(`[Telegram] User ${userId} successfully linked to ChatID ${chatId}`);

  } catch (error: any) {
    console.error('Bot Link Error:', error);
    
    if (error.code === 'P2025') {
      return ctx.reply("❌ Xatolik: Tizimda bunday foydalanuvchi topilmadi.");
    }
    
    ctx.reply("❌ Xatolik: Hisobni bog'lashda texnik muammo yuz berdi.");
  }
});


export const sendNotification = async (chatId: string, message: string) => {
  try {
    await bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error: any) {
    console.error(
      `Error sending Telegram message [ID: ${chatId}]:`,
      error.description
    );
  }
};


bot.launch().then(() => {
  console.log('🚀 Telegram Bot started successfully');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export default bot;