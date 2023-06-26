import express from "express";
const router = express.Router();

import { getAllBooksAndDetails } from "@services/books";

router.get("/", async (req, res) => {
  const filters = req.query;
  const books = await getAllBooksAndDetails(filters);
  res.json(books);
});

export default router;
