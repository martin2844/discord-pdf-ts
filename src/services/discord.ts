import * as Discord from "discord.js";
const client = new Discord.Client({ intents: [1, 512] });

import { BOT_TOKEN } from "@config";
import { BookMessage } from "@/types/discord";
import { Uploader } from "@/types/uploaders";

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

export { DiscordClient, fetchAllMessagesWithPdfs, fetchAvatarsForUploaders };
