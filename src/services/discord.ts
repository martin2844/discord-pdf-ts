import * as Discord from "discord.js";
const client = new Discord.Client({ intents: [1, 512, 32768] });

import { BOT_TOKEN, BOOK_CHANNEL_ID, REPLY_ENABLED } from "@config";
import { addBooksFromMessage } from "@services/books";
import Logger from "@utils/logger";
import { BookMessage } from "@ctypes/discord";
import { Uploader } from "@ctypes/uploaders";

const logger = Logger(module);

export default async function () {
  await client.login(BOT_TOKEN);
}

/**
 * Retrieves the Discord client instance.
 * @returns {Promise<Discord.Client>} - A promise that resolves to the Discord client instance.
 */
const DiscordClient = async (): Promise<Discord.Client> => {
  if (!client.readyAt) {
    await new Promise((resolve) => client.once("ready", resolve));
  }
  return client;
};

/**
 * Fetches all messages with PDF attachments from a Discord channel.
 * @param {Discord.TextChannel | string} channel - The Discord text channel or its ID to fetch messages from.
 * @param {string} lastId - The ID of the last processed message.
 * @param {number} lastTimestamp - The timestamp of the latest message in the database.
 * @param {BookMessage[]} messagesWithPdfs - An array of BookMessage objects representing messages with PDF attachments (optional).
 * @returns {Promise<BookMessage[]>} - A promise that resolves to an array of BookMessage objects with PDF attachments.
 */
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
      // attachments is a map, so there is no index per se
      let index = 0;
      msg.attachments.forEach((attachment) => {
        index++;
        if (attachment.name.endsWith(".pdf")) {
          messagesWithPdfs.push({
            uploader_id: msg.author.id,
            date: msg.createdAt.toISOString(),
            file: attachment.url,
            author_id: msg.author.id,
            author_tag: msg.author.tag,
          });
          logger.info("Message with Pdf Found: " + msg.author.tag);
        }
        if (index > 1) {
          // logger.info(
          //   "Multiple attachments found in message: " +
          //     msg.author.tag +
          //     "\n URL: " +
          //     attachment.url
          // );
          console.log(msg.attachments);
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

/**
 * Fetches avatars for the given uploaders.
 * @param {Uploader[]} uploaders - An array of uploaders to fetch avatars for.
 * @returns {Promise<Uploader[]>} - A promise that resolves to an array of uploaders with updated avatars.
 */
const fetchAvatars = async (uploaders: Uploader[]) => {
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
      message.channel.id !== BOOK_CHANNEL_ID
    )
      return;
    if (message.content.toLowerCase() === "/health") {
      await message.reply("I'm alive!");
    }
    console.log("Listening??");

    //Ignore messages without attachment
    if (message.attachments.size === 0) return;

    let index = 0;
    const messagesWithPdfs = [];
    message.attachments.forEach((attachment) => {
      index++;
      console.log("Attachment Number: " + index);
      if (attachment.name.endsWith(".pdf")) {
        // You found a PDF, do something with it!
        logger.info(
          `WS: Found a PDF in a message from ${message.author.tag}: ${attachment.url}`
        );
        messagesWithPdfs.push({
          uploader_id: message.author.id,
          date: message.createdAt.toISOString(),
          file: attachment.url,
          author_id: message.author.id,
          author_tag: message.author.tag,
        });
      }
    });
    if (messagesWithPdfs.length > 0) {
      addBooksFromMessage(messagesWithPdfs).then(() => {
        logger.info("Books added from messages");
      });
      if (REPLY_ENABLED) {
        if (messagesWithPdfs.length > 1) {
          message.reply(
            "Tremendo Titan Galatico! Gracias por la contribucion, estamos procesando los archivetes!"
          );
        } else {
          message.reply(
            "Gracias por la contribucion, estamos procesando el archivo!"
          );
        }
      }
    }
  })
);

export { DiscordClient, fetchAllMessagesWithPdfs, fetchAvatars };
