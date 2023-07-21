import express from "express";
import db from "@db";
import Auth from "@middleware/auth";
const router = express.Router();

router.get("/tables", Auth, async (_req, res) => {
  try {
    // Fetch all table names
    const tables = await db.raw(
      "SELECT name FROM sqlite_master WHERE type='table';"
    );
    let tablesAndColumns = {};

    // For each table, fetch columns
    for (let table of tables) {
      const tableName = table.name;
      const columns = await db.raw(`PRAGMA table_info(${tableName});`);
      tablesAndColumns[tableName] = columns.map((column) => column.name);
    }

    res.json({ tablesAndColumns });
  } catch (err) {
    res.status(500).send("An error occurred while fetching tables and columns");
  }
});

export default router;
