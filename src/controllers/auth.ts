import express from "express";
import jwt from "jsonwebtoken";

import { API_PASSWORD, JWT_SECRET } from "@config";

const router = express.Router();

router.post("/token", (req, res) => {
  const { password } = req.body;
  if (password === API_PASSWORD) {
    // Create JWT and set it to expire in 7 days
    const token = jwt.sign({ authorized: true }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({ token });
  } else {
    return res.status(401).json({ message: "Invalid password" });
  }
});

export default router;
