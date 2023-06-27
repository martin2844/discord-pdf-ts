import express from "express";

import Auth from "@middleware/auth";
import {
  handleBooksWithoutDetails,
  refreshBooks,
  getBooksWithNoSubjectNorDescription,
  getBooksWithoutKeywords,
  updateBookDescription,
  updateBookSubject,
  updateKeywords,
} from "@services/books";
import Logger from "@utils/logger";

const logger = Logger(module);
const router = express.Router();

router.post("/books", async (req, res) => {
  const status = await refreshBooks();
  res.json({ status });
});

router.post("/details", Auth, async (req, res) => {
  if (req.body.aiData) {
    const booksWithNoSubOrDesc = await getBooksWithNoSubjectNorDescription();
    const booksWithoutKeywords = await getBooksWithoutKeywords();

    const aiPromises = [];

    booksWithNoSubOrDesc.forEach((book) => {
      aiPromises.push(updateBookDescription(book));
      aiPromises.push(updateBookSubject(book));
      if (booksWithoutKeywords.includes(book)) {
        aiPromises.push(updateKeywords(book));
      }
    });

    booksWithoutKeywords.forEach((book) => {
      if (!booksWithNoSubOrDesc.includes(book)) {
        aiPromises.push(updateKeywords(book));
      }
    });

    Promise.all(aiPromises).then(() => {
      logger.info("All books updated");
    });

    return res.json({ status: "Working on it" });
  }

  const status = await handleBooksWithoutDetails();
  res.json({ status });
});

export default router;
