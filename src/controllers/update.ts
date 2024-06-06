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
  enqueueV2AiDetails,
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

router.post("/v2/details", Auth, async (req, res) => {
  if (req.body.aiData) {
    const booksWithNoSubOrDesc = await getBooksWithNoSubjectNorDescription();
    const booksWithoutKeywords = await getBooksWithoutKeywords();
    await Promise.all(booksWithNoSubOrDesc.map((b) => enqueueV2AiDetails(b)));
    booksWithoutKeywords.forEach((b) => enqueueAiKeywordsJob(b));
    return res.json({ status: "Working on it" });
  }
  const status = await enqueueBooksWithoutDetails();
  res.json({ status });
});

export default router;
