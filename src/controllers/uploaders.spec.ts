import request from "supertest";
import express from "express";
import router from "./uploaders";
import { updateUploaderAvatars } from "@services/uploaders";

// Mock the specific module method
jest.mock("@services/uploaders");

const mockUpdateUploaderAvatars = updateUploaderAvatars as jest.MockedFunction<
  typeof updateUploaderAvatars
>;

const app = express();
app.use(express.json());
app.use(router);

describe("PUT /avatars", () => {
  it("should update the avatars and return a success message", async () => {
    // Mock the function's implementation
    mockUpdateUploaderAvatars.mockImplementation(() => Promise.resolve());

    const response = await request(app).put("/avatars");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Avatars updated successfully",
    });
    expect(mockUpdateUploaderAvatars).toHaveBeenCalled();
  });

  it("should return an error message if something goes wrong", async () => {
    mockUpdateUploaderAvatars.mockImplementation(() => Promise.reject());

    const response = await request(app).put("/avatars");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "There was an error updating the avatars",
    });
    expect(mockUpdateUploaderAvatars).toHaveBeenCalled();
  });
});
