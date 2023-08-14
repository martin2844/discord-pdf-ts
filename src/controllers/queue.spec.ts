import request from "supertest";
import express from "express";
import { enqueue } from "@services/ampq";
import router from "./queue";
import { JobType } from "@ctypes/queue";

// Mock the specific module method
jest.mock("@services/ampq", () => ({
  enqueue: jest.fn(),
}));

const app = express();
app.use(router);

describe("GET /health", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should enqueue a health job and return a success message", async () => {
    // Mock the function's resolved value
    (enqueue as jest.MockedFunction<typeof enqueue>).mockResolvedValueOnce(
      undefined
    );

    // Act
    const response = await request(app).get("/health");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Q OK" });
    expect(enqueue).toHaveBeenCalledWith({ id: 1, type: JobType.HEALTH });
  });

  it("should return a 500 error if enqueueing fails", async () => {
    const mockError = new Error("Queue is down");
    // Mock the function to reject with an error
    (enqueue as jest.MockedFunction<typeof enqueue>).mockRejectedValueOnce(
      mockError
    );

    // Act
    const response = await request(app).get("/health");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: mockError.message });
    expect(enqueue).toHaveBeenCalledWith({ id: 1, type: JobType.HEALTH });
  });
});
