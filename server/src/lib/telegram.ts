import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import prisma from './prisma.js';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || 'secret_token');

bot.start(async (ctx) => {
  const payload = ctx.startPayload;
  const chatId = ctx.chat.id.toString();

  if (!payload) {
    return ctx.reply(
      "Welcome! To link your account, click the 'Connect Telegram' button in the Todo App dashboard."
    );
  }

  const userId = parseInt(payload);

  if (isNaN(userId)) {
    return ctx.reply("❌ Error: Invalid link format.");
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { telegramId: chatId }
    });

    await ctx.reply(
      "✅ Congratulations! Your account has been successfully connected. You will now receive task notifications."
    );
  } catch (error: any) {
    console.error('Bot Link Error:', error);
    
    if (error.code === 'P2025') {
      return ctx.reply("❌ Error: User not found in the system.");
    }
    
    ctx.reply("❌ Error: A technical issue occurred while linking the account.");
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
