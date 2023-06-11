import express from "express";
const router = express.Router();

import { getAllBooksAndDetails, refreshBooks } from "@services/books";

router.get("/", async (req, res) => {
  const books = await getAllBooksAndDetails();
  res.json(books);
});

router.get("/refresh", async (req, res) => {
  await refreshBooks();
  res.json({ success: true });
});

export default router;
