import express from "express";

import Auth from "@middleware/auth";
import {
  enqueueBooksWithoutDetails,
  refreshBooks,
  getBooksWithNoSubjectNorDescription,
  getBooksWithoutKeywords,
} from "@services/books";
import {
  enqueueAiDescriptionJob,
  enqueueAiKeywordsJob,
} from "@/services/queue";

const router = express.Router();

router.post("/books", async (req, res) => {
  const status = await refreshBooks();
  res.json({ status });
});

router.post("/details", Auth, async (req, res) => {
  if (req.body.aiData) {
    const booksWithNoSubOrDesc = await getBooksWithNoSubjectNorDescription();
    const booksWithoutKeywords = await getBooksWithoutKeywords();
    booksWithNoSubOrDesc.forEach((b) => enqueueAiDescriptionJob(b));
    booksWithoutKeywords.forEach((b) => enqueueAiKeywordsJob(b));
    return res.json({ status: "Working on it" });
  }
  const status = await enqueueBooksWithoutDetails();
  res.json({ status });
});

export default router;
