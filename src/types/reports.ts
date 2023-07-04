/**
 * @typedef {Object} Report
 * @property {number} id - The ID of the report.
 * @property {number} book_id - The ID of the book that the report pertains to.
 * @property {string} type - The type of the report.
 */
export type Report = {
  id: number;
  book_id: number;
  type: string;
};
