import booksController from "./books";
import repoController from "./repo";
import statusController from "./status";
import updateController from "./update";
import authController from "./auth";
// import dbController from '@controllers/db';

const apiPaths = [
  {
    path: "/books",
    handler: booksController,
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
].map((c) => ({ ...c, path: `/api${c.path}` }));

export default [
  ...apiPaths,
  //   {
  //     path: '/api/db',
  //     handler: dbController,
  //   },
  //   {
  //     path: '/',
  //     handler: viewsController,
  //   },
];
