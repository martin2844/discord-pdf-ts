import express from "express";

import { refreshBooks } from "@services/books";

const router = express.Router();

router.post("/", async (req, res) => {
  const status = await refreshBooks();
  res.json({ status });
});

export default router;
