import { config } from "dotenv";
config();

export const { PORT, BOT_TOKEN, IMGUR_CLIENT_ID, GITHUB_PAT, BOOK_CHANNEL_ID } =
  process.env;
