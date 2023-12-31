import express from "express";
import { getQueueStatus } from "@services/ampq";
import { refreshBooks, getBookCount } from "@services/books";

const router = express.Router();

router.get("/", async (_req, res) => {
  const status = await getQueueStatus();
  res.json({ status: status });
});

router.post("/", async (req, res) => {
  const status = await refreshBooks();
  res.json({ status });
});

router.get("/count", async (_req, res) => {
  const bookCount = await getBookCount();
  res.status(200).json({ bookCount });
});

router.get("/debug-sentry", async (_req, res, next) => {
  try {
    throw new Error("Sentry test");
  } catch (error) {
    next(error);
  }
});

export default router;
