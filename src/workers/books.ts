import * as amqp from "amqplib";
import { AMPQ_URL, AMPQ_QUEUE_NAME } from "@config";

interface Job {
  id: number;
  title: string;
}

async function connect() {
  try {
    const connection = await amqp.connect(AMPQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(AMPQ_QUEUE_NAME);

    console.log(`Waiting for messages in ${AMPQ_QUEUE_NAME}...`);

    channel.consume(AMPQ_QUEUE_NAME, (message) => {
      if (message !== null) {
        const input: Job = JSON.parse(message.content.toString());
        console.log(
          `Received job with id ${input.id} and title ${input.title}`
        );

        // If job is successful, acknowledge the job (remove it from queue)
        channel.ack(message);
      }
    });
  } catch (ex) {
    console.error(ex);
  }
}

connect();
