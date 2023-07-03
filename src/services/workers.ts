import { spawn, ChildProcess } from "child_process";
import path from "path";

const workers = (cb): ChildProcess => {
  const workerScriptPath = path.join(__dirname, "../workers/books.ts");
  const worker = spawn(
    "npx",
    ["ts-node", "-r", "tsconfig-paths/register", workerScriptPath],
    { shell: true }
  );
  worker.stdout.on("data", (data) => {
    console.log(`worker stdout: ${data}`);
  });
  worker.stderr.on("data", (data) => {
    console.error(`worker stderr: ${data}`);
  });
  worker.on("close", (code) => {
    console.log(`worker process exited with code ${code}`);
  });
  return cb();
};

export { workers };
