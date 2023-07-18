import request from "supertest";
import express from "express";
import router from "./db"; // adjust path as needed
import db from "@db";
import mockKnex from "mock-knex";

// Mock the auth middleware
jest.mock("@middleware/auth", () => (req, res, next) => next());

const app = express();
app.use(router);

describe("GET /tables", () => {
  let tracker;

  beforeAll(() => {
    // Setup the mock database tracker
    mockKnex.mock(db);
    tracker = mockKnex.getTracker();
  });

  afterAll(() => {
    // Remove the mock from the database
    mockKnex.unmock(db);
  });

  beforeEach(() => {
    // Install the tracker before each test
    tracker.install();
  });

  afterEach(() => {
    // Uninstall the tracker after each test
    tracker.uninstall();
  });

  it("should fetch tables and columns", async () => {
    tracker.on("query", (query) => {
      if (query.sql === "SELECT name FROM sqlite_master WHERE type='table';") {
        query.response([{ name: "table1" }, { name: "table2" }]);
      } else if (query.sql.startsWith("PRAGMA table_info")) {
        if (query.sql.includes("table1")) {
          query.response([{ name: "column1" }, { name: "column2" }]);
        } else if (query.sql.includes("table2")) {
          query.response([{ name: "column3" }, { name: "column4" }]);
        }
      }
    });

    const response = await request(app).get("/tables");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      tablesAndColumns: {
        table1: ["column1", "column2"],
        table2: ["column3", "column4"],
      },
    });
  });

  it("should return an error if the database operation fails", async () => {
    tracker.on("query", (query) => {
      query.reject(new Error("Database error"));
    });

    const response = await request(app).get("/tables");

    expect(response.status).toBe(500);
    expect(response.text).toBe(
      "An error occurred while fetching tables and columns"
    );
  });
});
