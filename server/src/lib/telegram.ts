import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || 'secret_token');

export const sendNotification = async (chatId: string, message: string) => {
  try {
    await bot.telegram.sendMessage(chatId, message);
  } catch (error) {
    console.error('Telegram xatolik:', error);
  }
};

export default bot;