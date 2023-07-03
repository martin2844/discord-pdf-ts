import * as amqp from "amqplib";
import { AMPQ_URL, AMPQ_QUEUE_NAME } from "@config";
import Logger from "@utils/logger";

const logger = Logger(module);
interface Job {
  id: number;
  type: string;
}

let QUEUE: amqp.Channel;

async function connectQ() {
  try {
    const connection = await amqp.connect(AMPQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(AMPQ_QUEUE_NAME);
    QUEUE = channel;
  } catch (ex) {
    console.error(ex);
  }
}

async function enqueue(job: Job) {
  QUEUE.sendToQueue(AMPQ_QUEUE_NAME, Buffer.from(JSON.stringify(job)));
  logger.info(`Job sent successfully ${job.id}`);
}

export { connectQ, enqueue };
