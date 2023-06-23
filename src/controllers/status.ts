import express from "express";

import { refreshBooks, isRefreshing } from "@services/books";

const router = express.Router();

router.get("/", async (req, res) => {
  res.json({ status: isRefreshing ? "Currently Working" : "Ready to work" });
});

router.post("/", async (req, res) => {
  const status = await refreshBooks();
  res.json({ status });
});

export default router;
