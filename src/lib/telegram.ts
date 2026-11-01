import { Telegraf } from "telegraf";

let cached: Telegraf | null = null;

function getBot(): Telegraf | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  if (!cached) cached = new Telegraf(token);
  return cached;
}

/** Возвращает причину сбоя или null, если сообщение ушло. Токен в причину не попадает. */
export async function notifyTelegram(
  message: string,
  attachment?: { filename: string; buffer: Buffer },
): Promise<string | null> {
  const bot = getBot();
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chatId) {
    console.warn("[telegram] skipped — TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set");
    return "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set";
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
    return null;
  } catch (err) {
    console.error("[telegram] send failed:", err);
    const reason = err instanceof Error ? err.message : String(err);
    return reason.replace(/bot\d+:[\w-]+/g, "bot***");
  }
}
