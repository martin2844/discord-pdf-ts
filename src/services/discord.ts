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
  if (lastTimestamp) {
    lastTimestamp = 0;
  }

  const messages = await channel.messages.fetch(options);
  if (messages.size === 0) {
    return messagesWithPdfs;
  }

  let olderMessageFound = false;

  messages.forEach((msg) => {
    // If the message is older or the same as the latest in the database, stop fetching
    if (msg.createdTimestamp <= lastTimestamp) {
      olderMessageFound = true;
      return;
    }

    //   console.log(`Message from ${msg.author.tag}: ${msg.content}`);
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
          // getAndSaveAvatar(client, msg.author.id, msg.author.tag); // You'll need to update this
          console.log("Message with Pdf Found: " + msg.author.tag);
        }
      });
    }
    if (olderMessageFound) {
      return messagesWithPdfs;
    }
    lastId = messages.last().id;
  });
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
