import request from "supertest";
import express from "express";
import router from "./repo";

import { getPdfsFromRepo, getUserAndRepoFromUrl } from "@services/github";
import { addBooksFromGH } from "@services/books";

// Mock the specific module methods
jest.mock("@services/github", () => ({
  getPdfsFromRepo: jest.fn(),
  getUserAndRepoFromUrl: jest.fn(),
}));

jest.mock("@services/books", () => ({
  addBooksFromGH: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use(router);

describe("POST /", () => {
  it("should fetch PDFs from a repo, extract the user, and add the books", async () => {
    // Setup mock data and function returns
    const mockRepo = "https://github.com/user/repo";
    const mockPdfs = [
      { date: "2023-08-14", file: "url1" },
      { date: "2023-08-15", file: "url2" },
    ];
    const mockUserAndRepo = { user: "user", repo: "repo" };
    const mockBooks = mockPdfs.map((pdf) => ({ ...pdf, uploader_id: "user" }));
    const mockStatus = "success";

    (
      getPdfsFromRepo as jest.MockedFunction<typeof getPdfsFromRepo>
    ).mockResolvedValueOnce(mockPdfs);
    (
      getUserAndRepoFromUrl as jest.MockedFunction<typeof getUserAndRepoFromUrl>
    ).mockReturnValueOnce(mockUserAndRepo);
    (
      addBooksFromGH as jest.MockedFunction<typeof addBooksFromGH>
    ).mockResolvedValueOnce(mockStatus);

    // Make request
    const response = await request(app).post("/").send({ repo: mockRepo });

    // Assertions
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: mockStatus });
    expect(getPdfsFromRepo).toHaveBeenCalledWith(mockRepo);
    expect(getUserAndRepoFromUrl).toHaveBeenCalledWith(mockRepo);
    expect(addBooksFromGH).toHaveBeenCalledWith(
      mockBooks,
      mockUserAndRepo.user
    );
  });
});
