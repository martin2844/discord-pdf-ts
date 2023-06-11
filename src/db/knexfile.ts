import path from "path";
const dbPath = path.resolve(__dirname, "../../books.db");

const config = {
  client: "sqlite3",
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.resolve(__dirname, "./migrations"),
  },
};

export default config;
