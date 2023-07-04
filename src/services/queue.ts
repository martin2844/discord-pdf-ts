import { enqueue } from "@services/ampq";
import { JobType } from "@ctypes/queue";

export async function enqueueDetailsJob(book_id: number) {
  return enqueue({ id: book_id, type: JobType.DETAILS });
}

export async function enqeueUploaderJob(uploader_id: number) {
  return enqueue({ id: uploader_id, type: JobType.UPLOADER });
}
