import request from "supertest";
import express from "express";

import {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
} from "@services/reports";

import router from "./reports";

jest.mock("express-rate-limit", () => {
  return jest.fn(() => (req, res, next) => next());
});
jest.mock("@middleware/reports", () => {
  return {
    validateReportBody: (req, res, next) => next(),
  };
});

jest.mock("@middleware/auth", () => {
  return (req, res, next) => next();
});

// Mock the specific module methods and middlewares
jest.mock("@services/reports");
jest.mock("@middleware/auth");
jest.mock("@middleware/reports");

const app = express();
app.use(express.json());
app.use(router);

describe("GET /", () => {
  it("should return a list of reports", async () => {
    const mockReports = [
      {
        id: 1,
        title: "Report 1",
        content: "Content 1",
        book_id: 101,
        type: "example_type",
      },
      {
        id: 2,
        title: "Report 2",
        content: "Content 2",
        book_id: 102,
        type: "example_type",
      },
    ];

    (
      getAllReports as jest.MockedFunction<typeof getAllReports>
    ).mockResolvedValueOnce(mockReports);

    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockReports);
  });
});

describe("GET /:id", () => {
  it("should return a report by ID", async () => {
    const mockReport = {
      id: 1,
      title: "Report 1",
      content: "Content 1",
      book_id: 101,
      type: "example_type",
    };

    (
      getReportById as jest.MockedFunction<typeof getReportById>
    ).mockResolvedValueOnce(mockReport);

    const response = await request(app).get("/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockReport);
  });

  it("should return a 404 error if report is not found", async () => {
    (
      getReportById as jest.MockedFunction<typeof getReportById>
    ).mockResolvedValueOnce(null);

    const response = await request(app).get("/999");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Report not found" });
  });
});

describe("POST /", () => {
  it("should create a report and return it", async () => {
    const newReportData = { type: "test", book_id: 1 };
    const mockCreatedReport = [1];

    (
      createReport as jest.MockedFunction<typeof createReport>
    ).mockResolvedValueOnce(mockCreatedReport);

    const response = await request(app).post("/").send(newReportData);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockCreatedReport);
  });
});

describe("PUT /:id", () => {
  it("should update a report and return success message", async () => {
    (
      updateReport as jest.MockedFunction<typeof updateReport>
    ).mockResolvedValueOnce(1); // This should be correct already.
    // any other functions you want to mock

    const response = await request(app)
      .put("/1")
      .send({ title: "Updated Report", content: "Updated Content" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Report updated successfully" });
  });

  it("should return a 404 error if report is not found", async () => {
    (
      updateReport as jest.MockedFunction<typeof updateReport>
    ).mockResolvedValueOnce(0);

    const response = await request(app)
      .put("/999")
      .send({ title: "Updated Report", content: "Updated Content" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Report not found" });
  });
});

describe("DELETE /:id", () => {
  it("should delete a report and return success message", async () => {
    (
      deleteReport as jest.MockedFunction<typeof deleteReport>
    ).mockResolvedValueOnce(1);

    const response = await request(app).delete("/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Report deleted successfully" });
  });

  it("should return a 404 error if report is not found", async () => {
    (
      deleteReport as jest.MockedFunction<typeof deleteReport>
    ).mockResolvedValueOnce(0);

    const response = await request(app).delete("/999");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Report not found" });
  });
});
