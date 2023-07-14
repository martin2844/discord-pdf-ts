import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "@config": "<rootDir>/src/config",
    "@db": "<rootDir>/src/db",
    "@controllers": "<rootDir>/src/controllers/index",
    "@databases": "<rootDir>/src/databases",
    "@dtos/(.*)": "<rootDir>/src/dtos/$1",
    "@exceptions/(.*)": "<rootDir>/src/exceptions/$1",
    "@interfaces/(.*)": "<rootDir>/src/interfaces/$1",
    "@middlewares": "<rootDir>/src/middlewares/index",
    "@models/(.*)": "<rootDir>/src/models/$1",
    "@ctypes/(.*)": "<rootDir>/src/types/$1",
    "@routes/(.*)": "<rootDir>/src/routes/$1",
    "@services/(.*)": "<rootDir>/src/services/$1",
    "@utils/(.*)": "<rootDir>/src/utils/$1",
    "@workers/(.*)": "<rootDir>/src/workers/$1",
  },
  moduleDirectories: ["<rootDir>", "src", "node_modules"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
};

export default config;
