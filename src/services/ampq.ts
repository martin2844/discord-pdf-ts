import * as amqp from "amqplib";
import { AMPQ_URL, AMPQ_QUEUE_NAME } from "@config";
import Logger from "@utils/logger";

const logger = Logger(module);
interface Job {
  id: number;
  type: number;
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
  if (!QUEUE) {
    // wait next tick
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (!QUEUE) {
      console.log("Queue not connected");
      return;
    }
  }
  QUEUE.sendToQueue(AMPQ_QUEUE_NAME, Buffer.from(JSON.stringify(job)));
  logger.info(`Job sent successfully ${job.id}`);
}

async function getQueueStatus() {
  try {
    const q = await QUEUE.checkQueue(AMPQ_QUEUE_NAME);
    if (q.messageCount > 0) {
      return "Busy working";
    } else {
      return "Idle, ready to work";
    }
  } catch (ex) {
    console.error(ex);
    return "Error occurred";
  }
}

export { connectQ, enqueue, getQueueStatus };
