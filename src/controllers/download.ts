import { addDownloadCountToBook, getBookById } from "@services/books";
import { fetchDownloadLinkFromDiscord } from "@services/discord";
import express from "express";
import rateLimit from "express-rate-limit";
import { BOOK_CHANNEL_ID } from "@config";

const router = express.Router();

// Initialize the in-memory store
let downloadRecords = new Map();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many download requests from this IP, please try again later.",
});

router.get("/:id", limiter, async (req, res) => {
  const { id } = req.params;
  const book = await getBookById(parseInt(id));
  const downloadLink = await fetchDownloadLinkFromDiscord(
    BOOK_CHANNEL_ID,
    book.message_id,
    book.file
  );
  const ip = req.ip;
  const key = `${ip}-${id}`;
  if (ip === "::1") {
    res.status(200).send(downloadLink);
    return;
  }
  // Check if the user with this IP has already downloaded this book
  if (!downloadRecords.has(key)) {
    // If not, increment the download count and add the IP-bookId to the records
    await addDownloadCountToBook(parseInt(id));
    downloadRecords.set(key, true);
  }
  // Check if the in-memory store is too large, and if so, clear it
  if (downloadRecords.size > 5000) {
    downloadRecords.clear();
  }
  res.status(200).send(downloadLink);
});

export default router;
