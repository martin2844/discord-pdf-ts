import request from "supertest";
import express from "express";
import router from "./download";
import { addDownloadCountToBook } from "@services/books";

jest.mock("@services/books", () => ({
  addDownloadCountToBook: jest.fn(() => Promise.resolve()),
  getBookById: jest.fn(() =>
    Promise.resolve({ message_id: "1", file: "file" })
  ),
}));

jest.mock("@services/discord", () => ({
  fetchDownloadLinkFromDiscord: jest.fn(() => Promise.resolve("link")),
}));

const app = express();
app.use(express.json());
app.use(router);

describe("POST /", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("increments download count for a new download from a unique IP-bookId", async () => {
    const response = await request(app)
      .post("/")
      .set("X-Forwarded-For", "123.123.123.123")
      .send({ bookId: "1" });

    expect(addDownloadCountToBook).toHaveBeenCalledWith("1");
    expect(response.statusCode).toBe(200);
  });

  it("does not increment download count for a repeated download from the same IP-bookId", async () => {
    // first request
    await request(app)
      .post("/")
      .set("X-Forwarded-For", "123.123.123.124")
      .send({ bookId: "2" });
    //Second request
    await request(app)
      .post("/")
      .set("X-Forwarded-For", "123.123.123.124")
      .send({ bookId: "2" });
    // verify that the function has been called once
    expect(addDownloadCountToBook).toHaveBeenCalledTimes(1);
  });

  it("responds with status 429 if rate limit is exceeded", async () => {
    for (let i = 0; i < 100; i++) {
      await request(app)
        .post("/")
        .set("X-Forwarded-For", "123.123.123.123")
        .send({ bookId: "1" });
    }

    const response = await request(app)
      .post("/")
      .set("X-Forwarded-For", "123.123.123.123")
      .send({ bookId: "1" });

    expect(response.statusCode).toBe(429);
  });
});
