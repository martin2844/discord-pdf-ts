import express from "express";
const router = express.Router();
import Auth from "@middleware/auth";

import {
  getAllBooksAndDetails,
  getBookById,
  deleteBookById,
  deleteBooksWithoutDetails,
  deleteOrphanBookDetails,
} from "@services/books";

router.get("/", async (req, res) => {
  const filters = req.query;
  const books = await getAllBooksAndDetails(filters);
  res.json(books);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const books = await getBookById(parseInt(id));
  res.json(books);
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
