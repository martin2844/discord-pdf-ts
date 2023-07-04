import db from "@db";
import { Suggestion } from "@ctypes/suggestions";

/**
 * @typedef {object} Suggestion
 * @property {number} id - The ID of the suggestion.
 * @property {number} book_id - The ID of the book that the suggestion pertains to.
 * @property {string} type - The type of the suggestion.
 * @property {boolean} accepted - Whether the suggestion has been accepted or not.
 * @property {string} suggestion - The suggestion text.
 */

/**
 * Retrieves a suggestion from the database by its ID.
 * @param {number} id - The ID of the suggestion to retrieve.
 * @returns {Promise<Suggestion>} - A promise that resolves to the retrieved suggestion.
 */
export const getSuggestionById = (id: number): Promise<Suggestion> => {
  return db("suggestions").select("*").where("id", id).first();
};

/**
 * Retrieves all suggestions from the database.
 * @returns {Promise<Suggestion[]>} - A promise that resolves to an array of all suggestions.
 */
export const getAllSuggestions = (): Promise<Suggestion[]> => {
  return db("suggestions").select("*");
};

/**
 * Inserts a new suggestion into the database.
 * @param {Suggestion} suggestion - The suggestion to insert.
 * @returns {Promise<number[]>} - A promise that resolves to the array of the inserted ID(s).
 */
export const createSuggestion = (suggestion: Suggestion): Promise<number[]> => {
  return db("suggestions").insert(suggestion);
};

/**
 * Updates a suggestion in the database.
 * @param {number} id - The ID of the suggestion to update.
 * @param {Suggestion} suggestion - An object with the updated suggestion fields.
 * @returns {Promise<number>} - A promise that resolves to the number of affected rows.
 */
export const updateSuggestion = (
  id: number,
  suggestion: Suggestion
): Promise<number> => {
  return db("suggestions").where("id", id).update(suggestion);
};

/**
 * Deletes a suggestion from the database.
 * @param {number} id - The ID of the suggestion to delete.
 * @returns {Promise<number>} - A promise that resolves to the number of affected rows.
 */
export const deleteSuggestion = (id: number): Promise<number> => {
  return db("suggestions").where("id", id).delete();
};
