import { Telegraf } from "telegraf";

let cached: Telegraf | null = null;

function getBot(): Telegraf | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  if (!cached) cached = new Telegraf(token);
  return cached;
}

export async function notifyTelegram(
  message: string,
  attachment?: { filename: string; buffer: Buffer },
): Promise<void> {
  const bot = getBot();
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chatId) {
    console.warn("[telegram] skipped — TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
    return;
  }
  try {
    if (attachment) {
      await bot.telegram.sendDocument(
        chatId,
        { source: attachment.buffer, filename: attachment.filename },
        { caption: message },
      );
    } else {
      await bot.telegram.sendMessage(chatId, message);
    }
  } catch (err) {
    console.error("[telegram] send failed:", err);
  }
}
