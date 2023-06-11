// const booksController = require('./books');
// const viewsController = require('./views');
// const dbController = require('./db');

import booksController from "./books";
// import dbController from '@controllers/db';

export default [
  {
    path: "/api/books",
    handler: booksController,
  },
  //   {
  //     path: '/api/db',
  //     handler: dbController,
  //   },
  //   {
  //     path: '/',
  //     handler: viewsController,
  //   },
];
