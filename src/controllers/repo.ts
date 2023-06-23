import express from "express";

import { getPdfsFromRepo, getUserAndRepoFromUrl } from "@services/github";
import { addBooksFromGH } from "@services/books";

const router = express.Router();

router.post("/", async (req, res) => {
  const { repo } = req.body;
  const pdfs = await getPdfsFromRepo(repo);
  const { user } = getUserAndRepoFromUrl(repo);
  const books = pdfs.map((pdf) => ({ ...pdf, uploader_id: user }));
  const status = await addBooksFromGH(books, user);
  res.json({ status });
});

export default router;
