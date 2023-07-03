import * as amqp from "amqplib";
import { AMPQ_URL, AMPQ_QUEUE_NAME } from "@config";

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

    // Define your job. This could be anything you want.
    // const job: Job = { id: 1, type: 'KeepAlive' };

    // // Send job to queue
    // channel.sendToQueue(AMPQ_QUEUE_NAME, Buffer.from(JSON.stringify(job)));
    // console.log(`Job sent successfully ${job.id}`);
  } catch (ex) {
    console.error(ex);
  }
}

async function enqueue(job: Job) {
  QUEUE.sendToQueue(AMPQ_QUEUE_NAME, Buffer.from(JSON.stringify(job)));
  console.log(`Job sent successfully ${job.id}`);
}

export { connectQ };
