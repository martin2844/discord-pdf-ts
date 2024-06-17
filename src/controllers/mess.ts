import express from "express";
import { DiscordClient } from "@/services/discord";
import { BOOK_CHANNEL_ID } from "@/config";
import { TextChannel } from "discord.js";
import { getBookDetailsFromPdfUrl } from "@/services/pdf";

const router = express.Router();

router.get("/", async (req, res) => {
  const client = await DiscordClient();
  const channel = await client.channels.fetch(BOOK_CHANNEL_ID);
  // Check if the channel is a text channel
  if (!(channel instanceof TextChannel)) {
    return res.send("Channel not found");
  }
  const message = await channel.messages.fetch("994248489787723819");
  // Get attachments
  const attachments = message.attachments.map((attachment) => attachment.url);
  console.log(attachments);
  for (let attachment of attachments) {
    const details = await getBookDetailsFromPdfUrl(
      {
        id: 2,
        uploader_id: "1",
        date: "2022-01-01",
        file: attachment,
        message_id: "994248489787723819",
      },
      true
    );
    // We got the details of the PDF - now what? - We could check a bunch of things.
    // Do we have author and title - if not, can we scrape the text besides metadata?
    // Can we send the PDF for analysis to GPT?
    // Can we then get keywords?
    console.log(details);
  }
  res.send(message);
});

export default router;
