import db from "@db";
import { Report } from "@ctypes/reports";

/**
 * Retrieves all reports from the database.
 * @returns {Promise<Report[]>} - A promise that resolves to an array of all reports.
 */
export const getAllReports = (): Promise<Report[]> => {
  return db("reports").select("*");
};

/**
 * Retrieves a report from the database by its ID.
 * @param {number} id - The ID of the report to retrieve.
 * @returns {Promise<Report | null>} - A promise that resolves to the retrieved report, or null if not found.
 */
export const getReportById = (id: number): Promise<Report | null> => {
  return db("reports").select("*").where("id", id).first();
};

/**
 * Creates a new report in the database.
 * @param {Report} report - The report to create.
 * @returns {Promise<number[]>} - A promise that resolves to the array containing the ID of the newly created report.
 */
export const createReport = (report: Report): Promise<number[]> => {
  return db("reports").insert(report, "id");
};

/**
 * Updates a report in the database.
 * @param {number} id - The ID of the report to update.
 * @param {Partial<Report>} updatedFields - An object with the fields to be updated.
 * @returns {Promise<number>} - A promise that resolves to the number of affected rows.
 */
export const updateReport = (
  id: number,
  updatedFields: Partial<Report>
): Promise<number> => {
  return db("reports").where("id", id).update(updatedFields);
};

/**
 * Deletes a report from the database.
 * @param {number} id - The ID of the report to delete.
 * @returns {Promise<number>} - A promise that resolves to the number of affected rows.
 */
export const deleteReport = (id: number): Promise<number> => {
  return db("reports").where("id", id).del();
};
