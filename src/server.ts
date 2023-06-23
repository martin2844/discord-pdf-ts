import express from "express";
import helmet from "helmet";
import cors from "cors";

import db from "@db";
import controllers from "@controllers";
import discord from "@services/discord";
import Logger from "@utils/logger";
import { PORT } from "@config";

const logger = Logger(module);

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors());
controllers.forEach((c) => app.use(c.path, c.handler));

discord().then(() => {
  logger.info("Discord Client Initialized");
});

db.migrate.latest().then(() => {
  logger.info("Migrations ran successfully");
});

//Global error handling - async controllers need try/catch and next(error) to access the following block
app.use((err, _req, res, _next) => {
  if (err && typeof err.message === "string") {
    logger.error("General Error: " + err.message);
    res.status(500).json({ error: err.message });
  } else {
    res.status(500).json({ error: "An unexpected error occurred" });
  }
});

app.listen(PORT, () => {
  logger.info("Server listening on port " + PORT);
});
