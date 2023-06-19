import express from "express";
const router = express.Router();

import {
  getAllBooksAndDetails,
  isRefreshing,
  refreshBooks,
} from "@services/books";
import { getPdfsFromRepo } from "@services/github";

router.get("/", async (req, res) => {
  const books = await getAllBooksAndDetails();
  res.json(books);
});

router.get("/refresh", async (req, res) => {
  const status = await refreshBooks();
  res.json({ status });
});

router.get("/status", async (req, res) => {
  const status = isRefreshing;
  res.json({ status });
});

router.post("/add-repo", async (req, res) => {
  const { repo } = req.body;
  const pdfs = await getPdfsFromRepo(repo);
  res.json([...pdfs]);
});

export default router;
