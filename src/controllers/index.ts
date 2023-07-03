import booksController from "./books";
import repoController from "./repo";
import statusController from "./status";
import updateController from "./update";
import authController from "./auth";
import qController from "./queue";
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
  {
    path: "/queue",
    handler: qController,
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
