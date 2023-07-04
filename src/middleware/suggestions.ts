export function validateSuggestionBody(req, res, next) {
  const { type, book_id, accepted, suggestion } = req.body;

  // Check if all necessary fields are present
  if (type === undefined || book_id === undefined || suggestion === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Check if 'type' and 'suggestion' are strings
  if (typeof type !== "string" || typeof suggestion !== "string") {
    return res
      .status(400)
      .json({ error: "Type and Suggestion must be strings" });
  }

  // Check if 'book_id' is a number
  if (typeof book_id !== "number") {
    return res.status(400).json({ error: "Book ID must be a number" });
  }

  // If all checks passed, move on to the next middleware or route handler
  next();
}
