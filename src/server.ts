import express from "express";
import helmet from "helmet";
import cors from "cors";

import db from "@db";
import controllers from "@controllers";
import discord from "@services/discord";
import { workers } from "@services/workers";
import { connectQ } from "@services/ampq";
import Logger from "@utils/logger";
import { PORT } from "@config";

let initServices = 0;
const totalServices = 5;
const servicesRunning = () => `[${initServices}/${totalServices}]`;

const logger = Logger(module);

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors());
controllers.forEach((c) => app.use(c.path, c.handler));

discord().then(() => {
  initServices++;
  logger.info(`${servicesRunning()} Discord Client Initialized`);
});

db.migrate.latest().then(() => {
  initServices++;
  logger.info(`${servicesRunning()} Migrations ran successfully`);
});

connectQ().then(() => {
  initServices++;
  logger.info(`${servicesRunning()} AMPQ Connected`);
});

workers(() => {
  initServices++;
  logger.info(`${servicesRunning()} Workers Initialized`);
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
  initServices++;
  logger.info(`${servicesRunning()} Server listening on port ${PORT}`);
});
