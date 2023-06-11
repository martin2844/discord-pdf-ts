import path from "path";
import knex from "knex";

const dbPath = path.resolve(__dirname, "../../books.db");

export default knex({
  client: "sqlite3",
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.resolve(__dirname, "./migrations"),
  },
});
