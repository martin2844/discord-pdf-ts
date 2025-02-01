import { spawn, ChildProcess } from "child_process";
import Logger from "@utils/logger";
import path from "path";

const logger = Logger(module);
const isDevelopment = process.env.NODE_ENV !== "production";
const MAX_RESTARTS = 5;
const RESTART_DELAY = 5000; // 5 seconds

class WorkerManager {
  private restartCount: number = 0;
  private worker: ChildProcess | null = null;

  startWorker(cb?: () => void): ChildProcess {
    const workerScript = isDevelopment ? "../workers/books.ts" : "../workers/books.js";
    const workerScriptPath = path.join(__dirname, workerScript);
    const cmd = isDevelopment ? "ts-node" : "node";
    const params = isDevelopment
      ? ["-r", "tsconfig-paths/register", workerScriptPath]
      : [workerScriptPath];

    const env = {
      ...process.env,
      NODE_OPTIONS: '--no-deprecation'
    };

    this.worker = spawn("npx", [cmd, ...params], {
      shell: true,
      env
    });

    this.setupWorkerListeners(cb);
    return this.worker;
  }

  private setupWorkerListeners(cb?: () => void) {
    if (!this.worker) return;

    this.worker.stdout.on("data", (data) => {
      logger.info(data);
    });

    this.worker.stderr.on("data", (data) => {
      logger.error(`worker stderr: ${data}`);
    });

    this.worker.on("close", (code) => {
      logger.error(`worker process exited with code ${code}`);
      this.handleWorkerExit(code, cb);
    });

    if (typeof cb === 'function') {
      cb();
    }
  }

  private handleWorkerExit(code: number | null, cb?: () => void) {
    if (code !== 0) {
      if (this.restartCount < MAX_RESTARTS) {
        logger.info(`Attempting to restart worker in ${RESTART_DELAY}ms. Attempt ${this.restartCount + 1}/${MAX_RESTARTS}`);
        setTimeout(() => {
          this.restartCount++;
          this.startWorker(cb);
        }, RESTART_DELAY);
      } else {
        logger.error(`Worker failed to start after ${MAX_RESTARTS} attempts. Manual intervention required.`);
        // Here you could implement additional notification mechanisms (email, Slack, etc.)
      }
    }
  }

  resetRestartCount() {
    this.restartCount = 0;
  }
}

const workerManager = new WorkerManager();

const workers = (cb?: () => void): ChildProcess => {
  return workerManager.startWorker(cb);
};

export { workers };
