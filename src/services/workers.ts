import { spawn, ChildProcess } from "child_process";
import Logger from "@utils/logger";
import path from "path";

const logger = Logger(module);
const isDevelopment = process.env.NODE_ENV !== "production";

const workers = (cb): ChildProcess => {
  const workerScript = isDevelopment
    ? "../workers/books.ts"
    : "../workers/books.js";
  const workerScriptPath = path.join(__dirname, workerScript);
  const cmd = isDevelopment ? "ts-node" : "node";
  const params = isDevelopment
    ? ["-r", "tsconfig-paths/register", workerScriptPath]
    : [workerScriptPath];
  const worker = spawn("npx", [cmd, ...params], { shell: true });

  worker.stdout.on("data", (data) => {
    logger.info(data);
  });
  worker.stderr.on("data", (data) => {
    logger.error(`worker stderr: ${data}`);
  });
  worker.on("close", (code) => {
    logger.error(`worker process exited with code ${code}`);
  });
  return cb();
};

export { workers };
