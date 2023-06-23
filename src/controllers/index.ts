// const booksController = require('./books');
// const viewsController = require('./views');
// const dbController = require('./db');

import booksController from "./books";
import repoController from "./repo";
import statusController from "./status";
import updateController from "./update";
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
