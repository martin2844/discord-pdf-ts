import path from "path";
import winston from "winston";

const { createLogger, format, transports } = winston;
const { combine, timestamp, label, printf, colorize } = format;

//Define the format of the log
const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

// Return the last folder name in the path and the calling
// module's filename.
const getLabel = function (callingModule: NodeModule) {
  const parts = callingModule.filename.split(path.sep);
  return path.join(parts[parts.length - 2], parts.pop() as string);
};

//create logger
const logger = (module?: NodeModule) => {
  return createLogger({
    format: combine(
      label({ label: module ? getLabel(module) : "default" }),
      timestamp(),
      myFormat,
      format.colorize({
        colors: {
          info: "green",
          error: "red",
          warning: "orange",
          debug: "purple",
          notice: "yellow",
          crit: "magenta",
          emerg: "red",
        },
      })
    ),
    level: "info",
    // format: winston.format.json(),
    defaultMeta: { service: "user-service" },
    transports: [
      //
      // - Write all logs with level `error` and below to `error.log`
      // - Write all logs with level `info` and below to `combined.log`
      //
      new transports.Console({
        format: combine(colorize(), myFormat),
      }),
      new winston.transports.File({
        filename: "./logs/error.log",
        level: "error",
        maxsize: 1000 * 1000 * 50,
        maxFiles: 20,
      }),
      new winston.transports.File({
        filename: "./logs/combined.log",
        maxsize: 1000 * 1000 * 50,
        maxFiles: 20,
      }),
    ],
  });
};

//
// If we're in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
// and don't log to file
//
if (process.env.NODE_ENV === "production") {
  logger(module)
    .clear()
    .add(
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    );
}

export default logger;
