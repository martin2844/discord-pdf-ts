import { config } from "dotenv";
config();

export const {
  PORT,
  BOT_TOKEN,
  GITHUB_PAT,
  BOOK_CHANNEL_ID,
  OPENAI_KEY,
  API_PASSWORD,
  JWT_SECRET,
  AMPQ_URL,
  AMPQ_QUEUE_NAME,
  SENTRY_DSN,
  REPLY_ENABLED,
  MATE_UPLOAD_URL,
  MATE_UPLOAD_KEY,
} = process.env;
