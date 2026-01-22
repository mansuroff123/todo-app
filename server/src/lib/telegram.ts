import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import prisma from './prisma.js';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || 'secret_token');


bot.start(async (ctx) => {
  const payload = ctx.startPayload;
  const chatId = ctx.chat.id.toString();

  const userId = parseInt(payload);

  if (!payload || isNaN(userId)) {
    return ctx.reply(
      "Welcome! To link your account, please click the 'Connect Telegram' button on the Todo App dashboard."
    );
  }

  try {
    await prisma.user.update({
      where: { 
        id: userId
      },
      data: { 
        telegramChatId: chatId 
      }
    });

    await ctx.reply("✅ Success! Your Telegram account has been linked to TodoPlanner.");
  } catch (error: any) {
    console.error('Bot Link Error:', error);
    
    if (error.code === 'P2025') {
       return ctx.reply("❌ Error: User not found in our system.");
    }
    
    ctx.reply("❌ Error: Could not link your account. Please try again later.");
  }
});

export const sendNotification = async (chatId: string, message: string) => {
  try {
    await bot.telegram.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Telegram Error:', error);
  }
};

bot.launch();

export default bot;