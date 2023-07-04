import express from "express";
import rateLimit from "express-rate-limit";
import {
  getAllSuggestions,
  getSuggestionById,
  createSuggestion,
  updateSuggestion,
  deleteSuggestion,
} from "@services/suggestions";
import Auth from "@middleware/auth";
import { validateSuggestionBody } from "@middleware/suggestions";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 100 requests per windowMs
  message: "Too many download requests from this IP, please try again later.",
});

const router = express.Router();

// GET all suggestions
router.get("/", async (_req, res) => {
  const suggestions = await getAllSuggestions();
  res.json(suggestions);
});

// GET a specific suggestion by id
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const suggestion = await getSuggestionById(id);
  if (!suggestion) {
    res.status(404).json({ error: "Suggestion not found" });
  } else {
    res.json(suggestion);
  }
});

// POST new suggestion
router.post("/", limiter, validateSuggestionBody, async (req, res) => {
  const newSuggestion = req.body;
  const [id] = await createSuggestion(newSuggestion);
  res.status(201).json({ id, ...newSuggestion });
});

// PUT update a suggestion
router.put("/:id", Auth, validateSuggestionBody, async (req, res) => {
  const id = parseInt(req.params.id);
  const updatedFields = req.body;
  const affectedCount = await updateSuggestion(id, updatedFields);
  if (affectedCount === 0) {
    res.status(404).json({ error: "Suggestion not found" });
  } else {
    res.json({ id, ...updatedFields });
  }
});

// DELETE a suggestion
router.delete("/:id", Auth, async (req, res) => {
  const id = parseInt(req.params.id);
  const affectedCount = await deleteSuggestion(id);
  if (affectedCount === 0) {
    res.status(404).json({ error: "Suggestion not found" });
  } else {
    res.status(204).end();
  }
});

export default router;
