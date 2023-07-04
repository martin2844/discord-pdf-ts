import express from "express";
import rateLimit from "express-rate-limit";

import {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
} from "@services/reports";
import Auth from "@middleware/auth";
import { validateReportBody } from "@middleware/reports";

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 100 requests per windowMs
  message: "Too many download requests from this IP, please try again later.",
});

// Get all reports
router.get("/", async (_req, res) => {
  const reports = await getAllReports();
  res.json(reports);
});

// Get report by id
router.get("/:id", async (req, res) => {
  const report = await getReportById(Number(req.params.id));
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }
  res.json(report);
});

// Create new report
router.post("/", limiter, validateReportBody, async (req, res) => {
  const newReport = await createReport(req.body);
  res.status(201).json(newReport);
});

// Update report
router.put("/:id", Auth, validateReportBody, async (req, res) => {
  const updatedRows = await updateReport(Number(req.params.id), req.body);
  if (updatedRows === 0) {
    return res.status(404).json({ error: "Report not found" });
  }
  res.json({ message: "Report updated successfully" });
});

// Delete report
router.delete("/:id", Auth, async (req, res) => {
  const deletedRows = await deleteReport(Number(req.params.id));
  if (deletedRows === 0) {
    return res.status(404).json({ error: "Report not found" });
  }
  res.json({ message: "Report deleted successfully" });
});

export default router;
