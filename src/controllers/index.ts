import booksController from "./books";
import suggestionsController from "./suggestions";
import repoController from "./repo";
import statusController from "./status";
import updateController from "./update";
import authController from "./auth";
import qController from "./queue";
import dbController from "./db";
import uploadersHandler from "./uploaders";
import downloadController from "./download";
import reportsController from "./reports";

const apiPaths = [
  {
    path: "/books",
    handler: booksController,
  },
  {
    path: "/suggestions",
    handler: suggestionsController,
  },
  {
    path: "/reports",
    handler: reportsController,
  },
  {
    path: "/repo",
    handler: repoController,
  },
  {
    path: "/status",
    handler: statusController,
  },
  {
    path: "/update",
    handler: updateController,
  },
  {
    path: "/auth",
    handler: authController,
  },
  {
    path: "/queue",
    handler: qController,
  },
  {
    path: "/uploaders",
    handler: uploadersHandler,
  },
  {
    path: "/download",
    handler: downloadController,
  },
].map((c) => ({ ...c, path: `/api${c.path}` }));

export default [
  ...apiPaths,
  {
    path: "/db",
    handler: dbController,
  },
];
