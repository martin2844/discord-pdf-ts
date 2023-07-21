import express from "express";
const router = express.Router();

import { updateUploaderAvatars } from "@services/uploaders";

router.put("/avatars", async (req, res) => {
  try {
    await updateUploaderAvatars();
    res
      .status(200)
      .json({ success: true, message: "Avatars updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "There was an error updating the avatars" });
  }
});

export default router;
