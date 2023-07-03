import express from "express";
import { enqueue } from "@services/ampq";

const router = express.Router();

router.get("/health", async (_req, res) => {
  try {
    await enqueue({ id: 1, type: "health test" });
    res.status(200).json({ message: "Q OK" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
