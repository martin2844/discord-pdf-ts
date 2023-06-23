import express from "express";
const router = express.Router();

import { getAllBooksAndDetails } from "@services/books";

router.get("/", async (req, res) => {
  const books = await getAllBooksAndDetails();
  res.json(books);
});

export default router;
