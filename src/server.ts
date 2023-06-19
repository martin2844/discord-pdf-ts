import express from "express";
import helmet from "helmet";

import db from "@db";
import controllers from "@controllers";
import discord from "@services/discord";
import { PORT } from "@config";

const app = express();
app.use(helmet());
app.use(express.json());
controllers.forEach((c) => app.use(c.path, c.handler));

discord().then(() => {
  console.log("Discord client initialized");
});

db.migrate.latest().then(() => {
  console.log("Migrations ran successfully");
});

app.listen(PORT, () => {
  console.log("Server listening on port " + PORT);
});
