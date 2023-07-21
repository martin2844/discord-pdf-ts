import express from "express";
import Auth from "@middleware/auth";
const router = express.Router();

import {
  updateUploaderAvatars,
  getAllUploaders,
  updateUploader,
} from "@services/uploaders";

router.put("/avatars", Auth, async (req, res) => {
  try {
    await updateUploaderAvatars();
    res
      .status(200)
      .json({ success: true, message: "Avatars updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "There was an error updating the avatars" });
  }
});

router.get("/", async (req, res) => {
  try {
    const uploaders = await getAllUploaders();
    res.status(200).json(uploaders);
  } catch (error) {
    res.status(500).json({ error: "There was an error getting the uploaders" });
  }
});

router.put("/:uploader_id", Auth, async (req, res) => {
  try {
    const uploader_id = req.params.uploader_id;
    await updateUploader(uploader_id, req.body);
    res
      .status(200)
      .json({ success: true, message: "Uploader updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "There was an error updating the uploader" });
  }
});
export default router;
