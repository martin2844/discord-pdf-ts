import request from "supertest";
import express from "express";
import router from "./uploaders";
import {
  updateUploaderAvatars,
  getAllUploaders,
  updateUploader,
} from "@services/uploaders";

// Mock the specific module method
jest.mock("@services/uploaders");

jest.mock("@middleware/auth", () => (_1, _2, next) => next());

const mockUpdateUploaderAvatars = updateUploaderAvatars as jest.MockedFunction<
  typeof updateUploaderAvatars
>;

const mockGetAllUploaders = getAllUploaders as jest.MockedFunction<
  typeof getAllUploaders
>;

const mockUpdateUploader = updateUploader as jest.MockedFunction<
  typeof updateUploader
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

describe("GET /", () => {
  it("should return all uploaders", async () => {
    const mockUploaders = [
      // Add your mocked uploaders data here
    ];

    mockGetAllUploaders.mockImplementation(() =>
      Promise.resolve(mockUploaders)
    );

    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUploaders);
    expect(mockGetAllUploaders).toHaveBeenCalled();
  });

  it("should return an error message if something goes wrong", async () => {
    mockGetAllUploaders.mockImplementation(() => Promise.reject());

    const response = await request(app).get("/");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "There was an error getting the uploaders",
    });
    expect(mockGetAllUploaders).toHaveBeenCalled();
  });
});

describe("PUT /:uploader_id", () => {
  const uploader_id = "test_id";

  it("should update an uploader and return a success message", async () => {
    const updateData = {
      // Add your update data here
    };

    mockUpdateUploader.mockImplementation(() => Promise.resolve(1));

    const response = await request(app).put(`/${uploader_id}`).send(updateData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Uploader updated successfully",
    });
    expect(mockUpdateUploader).toHaveBeenCalledWith(uploader_id, updateData);
  });

  it("should return an error message if something goes wrong", async () => {
    mockUpdateUploader.mockImplementation(() => Promise.reject());

    const response = await request(app).put(`/${uploader_id}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "There was an error updating the uploader",
    });
    expect(mockUpdateUploader).toHaveBeenCalled();
  });
});
