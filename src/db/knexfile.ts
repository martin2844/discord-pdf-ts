import path from "path";
const dbPath = path.resolve(__dirname, "../../data/books.db");

const config = {
  client: "sqlite3",
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.resolve(__dirname, "./migrations"),
    loadExtensions: [".ts", ".js"],
  },
};

export default config;
