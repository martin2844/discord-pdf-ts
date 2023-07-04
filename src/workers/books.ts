import * as amqp from "amqplib";
import { AMPQ_URL, AMPQ_QUEUE_NAME } from "@config";
import { Job, JobType } from "@ctypes/queue";
import {
  sourceAndSaveBookDetails,
  updateBookDescription,
  updateBookSubject,
  updateKeywords,
} from "@/services/books";
import { up } from "@/db/migrations/00_initial_tables";

const sourceDetails = async (bookId: number) => {
  await sourceAndSaveBookDetails(bookId);
};

const updateDescriptionAndSubject = async (bookId: number) => {
  await updateBookDescription(bookId);
  await updateBookSubject(bookId);
};

const processJob = async (job: Job) => {
  switch (job.type) {
    case JobType.DETAILS:
      await sourceDetails(job.id);
      break;
    case JobType.AI_DESCRIPTION:
      await updateDescriptionAndSubject(job.id);
      break;
    case JobType.AI_KEYWORDS:
      await updateKeywords(job.id);
      break;
    case JobType.HEALTH:
      console.log("Health check");
      break;
    default:
      break;
  }
};

async function connect() {
  try {
    const connection = await amqp.connect(AMPQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(AMPQ_QUEUE_NAME);

    console.log(
      `Worker Ready, waiting for messages in queue ${AMPQ_QUEUE_NAME}...`
    );

    channel.consume(AMPQ_QUEUE_NAME, async (message) => {
      if (message !== null) {
        const input: Job = JSON.parse(message.content.toString());
        console.log(`Received job with id ${input.id} and title ${input.type}`);
        await processJob(input);
        // If job is successful, acknowledge the job (remove it from queue)
        channel.ack(message);
      }
    });
  } catch (ex) {
    console.error(ex);
  }
}

connect();
