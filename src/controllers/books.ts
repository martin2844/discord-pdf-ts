import express from "express";
const router = express.Router();
import Auth from "@middleware/auth";

import {
  getAllBooksAndDetails,
  getBookAndDetails,
  modifyBook,
  deleteBookById,
  deleteBooksWithoutDetails,
  deleteOrphanBookDetails,
  getBookById,
} from "@services/books";

import { fetchDownloadLinkFromDiscord } from "@services/discord";

router.get("/", async (req, res) => {
  const filters = req.query;
  const books = await getAllBooksAndDetails(filters);
  res.json(books);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const books = await getBookAndDetails(parseInt(id));
  res.json(books);
});

router.get("/:id/download", async (req, res) => {
  const { id } = req.params;
  const book = await getBookById(parseInt(id));
  const URL = await fetchDownloadLinkFromDiscord(
    process.env.BOOK_CHANNEL_ID,
    book.message_id,
    book.file
  );
  res.json(URL);
});

router.patch("/:bookId", Auth, async (req, res) => {
  const { bookId } = req.params;
  const updates = req.body;

  if (!bookId || isNaN(parseInt(bookId))) {
    return res.status(400).json({ error: "Invalid or no id provided" });
  }

  try {
    const updated = await modifyBook(parseInt(bookId), updates);

    if (updated === 0) {
      return res.status(404).json({ error: "No records were found to update" });
    }

    return res.status(200).json({ success: true, updated });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ error: "There was an error updating the book" });
  }
});

router.delete("/undetailed", Auth, async (req, res) => {
  const deleted = await deleteBooksWithoutDetails();
  const deleteDetails = await deleteOrphanBookDetails();
  res.status(200).json({ deleted, deleteDetails });
});

router.delete("/:id", Auth, async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(parseInt(id)))
    return res.status(404).json({ error: "Invalid or no id provided" });
  const del = await deleteBookById(parseInt(id));
  res.json(del);
});

export default router;
