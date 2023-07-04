/**
 * @typedef {Object} Suggestion
 * @property {number} id - The ID of the suggestion.
 * @property {number} book_id - The ID of the book that the suggestion pertains to.
 * @property {string} type - The type of the suggestion.
 * @property {boolean} accepted - Whether the suggestion has been accepted or not.
 * @property {string} suggestion - The suggestion text.
 */
export type Suggestion = {
  id: number;
  book_id: number;
  type: string;
  accepted: boolean;
  suggestion: string;
};
