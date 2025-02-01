import express from "express";
import helmet from "helmet";
import crypto from "crypto";
import cors from "cors";
import * as Sentry from "@sentry/node";
import path from "path";
import expressEjsLayouts from 'express-ejs-layouts';
import { getBookCount, getAllBooksAndDetails, getKeywords } from "@services/books";
import { getQueueStatus } from "@services/ampq";

import db from "@db";
import controllers from "@controllers";
import discord from "@services/discord";
import { workers } from "@services/workers";
import { connectQ } from "@services/ampq";
import { sentryInit } from "@services/sentry";
import Logger from "@utils/logger";
import { PORT } from "@config";

let initServices = 0;
const totalServices = 5;
const servicesRunning = () => `[${initServices}/${totalServices}]`;

const logger = Logger(module);

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"]
      }
    }
  })
);
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));
// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');
app.use(expressEjsLayouts);

// Serve static files

sentryInit(Sentry, app);
// Trace incoming requests
app.use(Sentry.Handlers.requestHandler() as express.RequestHandler);
app.use(Sentry.Handlers.tracingHandler());
controllers.forEach((c) => app.use(c.path, c.handler));

app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler);

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

// Add a route for the home page before your API routes
app.get('/', async (req, res) => {
  try {
    const bookCount = await getBookCount();
    const books = await getAllBooksAndDetails();
    const status = await getQueueStatus();
    const keywords = await getKeywords();

    res.render('home', {
      title: 'Discord PDF Bot',
      bookCount: bookCount.completeBooks,
      books,
      status,
      keywords
    });
  } catch (error) {
    logger.error('Error rendering home page: ' + error.message);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the page'
    });
  }
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
