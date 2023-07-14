import express from "express";
const router = express.Router();

import { getAllBooksAndDetails, getBookById } from "@services/books";

router.get("/", async (req, res) => {
  const filters = req.query;
  const books = await getAllBooksAndDetails(filters);
  res.json(books);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) res.status(400).json({ error: "No id provided" });
  const books = await getBookById(parseInt(id));
  res.json(books);
});

export default router;
