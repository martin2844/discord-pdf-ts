import * as Discord from "discord.js";
const client = new Discord.Client({ intents: [1, 512, 32768] });

import { BOT_TOKEN } from "@config";
import { BookMessage } from "@/types/discord";
import { Uploader } from "@/types/uploaders";
import { addSingleBookFromMessage } from "./books";

export default async function () {
  console.log("Initializing discord client");
  await client.login(BOT_TOKEN); // Replace with your bot token
}

const DiscordClient = async (): Promise<Discord.Client> => {
  if (!client.readyAt) {
    await new Promise((resolve) => client.once("ready", resolve));
  }
  return client;
};

const fetchAllMessagesWithPdfs = async (
  channel: Discord.TextChannel | string,
  lastId,
  lastTimestamp,
  messagesWithPdfs: BookMessage[] = []
): Promise<BookMessage[]> => {
  //Accept both string and channel, string would be the initial call, channel would be the recursive call
  if (typeof channel === "string") {
    channel = (await client.channels.fetch(channel)) as Discord.TextChannel;
  }
  const options = { limit: 100, before: lastId };

  const messages = await channel.messages.fetch(options);
  if (messages.size === 0) {
    return messagesWithPdfs;
  }

  // Reverse the messages array to process them from newest to oldest
  const sortedMessages = [...messages.values()].sort(
    (a, b) => b.createdTimestamp - a.createdTimestamp
  );

  for (const msg of sortedMessages) {
    // If the message is older or the same as the latest in the database, stop processing
    if (lastTimestamp !== null && msg.createdTimestamp <= lastTimestamp) {
      return messagesWithPdfs;
    }

    if (msg.attachments.size > 0) {
      msg.attachments.forEach((attachment) => {
        if (attachment.name.endsWith(".pdf")) {
          messagesWithPdfs.push({
            uploader_id: msg.author.id,
            date: msg.createdAt.toISOString(),
            file: attachment.url,
            author_id: msg.author.id,
            author_tag: msg.author.tag,
          });
          console.log("Message with Pdf Found: " + msg.author.tag);
        }
      });
    }
    lastId = msg.id;
  }

  return await fetchAllMessagesWithPdfs(
    channel,
    lastId,
    lastTimestamp,
    messagesWithPdfs
  );
};

const fetchPdfFromSingleMessage = async (
  msg: Discord.Message
): Promise<BookMessage | null> => {
  // If the message has no attachments or does not contain a pdf, return null
  if (
    msg.attachments.size === 0 ||
    !msg.attachments.some((attachment) => attachment.name.endsWith(".pdf"))
  ) {
    return null;
  }

  let pdfAttachment = msg.attachments.find((attachment) =>
    attachment.name.endsWith(".pdf")
  );

  if (pdfAttachment) {
    return {
      uploader_id: msg.author.id,
      date: msg.createdAt.toISOString(),
      file: pdfAttachment.url,
      author_id: msg.author.id,
      author_tag: msg.author.tag,
    };
  }

  return null;
};

const fetchAvatarsForUploaders = async (uploaders: Uploader[]) => {
  const client = await DiscordClient();
  const promises = uploaders.map((uploader) => {
    return client.users.fetch(uploader.uploader_id);
  });
  const users = await Promise.all(promises);
  users.forEach((user: Discord.User) => {
    //get index of matching uploader
    const index = uploaders.findIndex(
      (uploader) => uploader.uploader_id === user.id
    );
    uploaders[index].avatar = user.displayAvatarURL();
  });
  return uploaders;
};

// WEBSOCKET CODE BEGIN
DiscordClient().then((c) =>
  c.on("messageCreate", async (message) => {
    // Ignore messages that are not from the specified TextChannel (DMs, VoiceChannels, etc.)
    if (
      !(message.channel instanceof Discord.TextChannel) ||
      message.channel.id !== "805973548924403722"
    )
      return;
    if (message.content.toLowerCase() === "/health") {
      await message.reply("I'm alive!");
    }

    // You can also add more conditions, for example ignoring messages that don't have attachments
    if (message.attachments.size === 0) return;

    message.attachments.forEach((attachment) => {
      if (attachment.name.endsWith(".pdf")) {
        // You found a PDF, do something with it!
        console.log(
          `Found a PDF in a message from ${message.author.tag}: ${attachment.url}`
        );
        fetchPdfFromSingleMessage(message).then((book) => {
          if (book) {
            addSingleBookFromMessage(book).then(() => {
              const url = new URL(book.file);
              const filename = url.pathname.split("/").pop();
              message.reply(
                `Gracias **${book.author_tag}** por la contribucion, agregamos **${filename}** a la base de datos! \n https://libros.codigomate.com`
              );
            });
          }
        });
      }
    });
  })
);

export { DiscordClient, fetchAllMessagesWithPdfs, fetchAvatarsForUploaders };
