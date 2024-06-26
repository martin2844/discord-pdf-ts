import request from "supertest";
import express from "express";
import {
  getAllBooksAndDetails,
  getBookAndDetails,
  deleteBookById,
  deleteBooksWithoutDetails,
  modifyBook,
  deleteOrphanBookDetails,
} from "@services/books";
import router from "./books";

// Mock the specific module method
jest.mock("@services/books", () => ({
  getAllBooksAndDetails: jest.fn(),
  getBookAndDetails: jest.fn(),
  deleteBookById: jest.fn(),
  modifyBook: jest.fn(),
  deleteBooksWithoutDetails: jest.fn(),
  deleteOrphanBookDetails: jest.fn(),
}));

jest.mock("@middleware/auth", () => (_1, _2, next) => next());

const app = express();
app.use(express.json());
app.use(router);

const mockBooks = [
  {
    id: 1,
    book_id: 1,
    book_details_id: 1,
    uploader_id: "504646581191049216",
    file: "https://cdn.discordapp.com/attachments/805973548924403722/1128372429501255771/RTC_-_Freelance_Newbie-RealToughCandy_2019.pdf",
    downloads: 0,
    date: "2023-07-11T17:09:11.450Z",
    name: "AmericanJoe#6551",
    avatar:
      "https://cdn.discordapp.com/avatars/504646581191049216/407617e823e4e68b19a612bd51991624.webp",
    source: "discord",
    cover_image:
      "http://res.cloudinary.com/dzffqrmd2/image/upload/v1689095355/discord-bot/txxslqqzqp2upwgzqkg9.png",
    title:
      "Freelance Newbie: A Beginners Guide to Finding Clients, Making Money, and Building Your Web Development Empire",
    author: "RealTough Candy",
    subject: "",
    description: "",
    keywords: null,
    message_id: "1128372429501255771",
  },
];

describe("GET /", () => {
  it("should return all books and details", async () => {
    // Mock the function's resolved value
    (
      getAllBooksAndDetails as jest.MockedFunction<typeof getAllBooksAndDetails>
    ).mockResolvedValueOnce(mockBooks);
    // Act
    const response = await request(app).get("/");
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockBooks);
    expect(getAllBooksAndDetails).toHaveBeenCalledWith({});
  });
});

describe("GET /:id", () => {
  it("should return a book by its ID", async () => {
    const mockBook = mockBooks[0];
    (
      getBookAndDetails as jest.MockedFunction<typeof getBookAndDetails>
    ).mockResolvedValueOnce(mockBook);

    const response = await request(app).get("/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockBook);
    expect(getBookAndDetails).toHaveBeenCalledWith(1);
  });
});

describe("DELETE /:id", () => {
  it("should delete a book by its ID and return the deleted book", async () => {
    (
      deleteBookById as jest.MockedFunction<typeof deleteBookById>
    ).mockResolvedValueOnce(1);

    const response = await request(app).delete("/1");

    expect(response.status).toBe(200);
    expect(deleteBookById).toHaveBeenCalledWith(1);
  });
});

describe("PATCH /:bookId", () => {
  it("should update a book and return the number of updated records", async () => {
    (
      modifyBook as jest.MockedFunction<typeof modifyBook>
    ).mockResolvedValueOnce(1);

    const response = await request(app)
      .patch("/1")
      .send({ title: "New Title" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, updated: 1 });
  });

  it("should return an error when no records were found to update", async () => {
    (
      modifyBook as jest.MockedFunction<typeof modifyBook>
    ).mockResolvedValueOnce(0);

    const response = await request(app)
      .patch("/1")
      .send({ title: "New Title" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "No records were found to update" });
  });

  it("should return an error when an invalid bookId is provided", async () => {
    const response = await request(app)
      .patch("/invalidId")
      .send({ title: "New Title" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid or no id provided" });
  });
});

describe("DELETE /undetailed", () => {
  it("should delete books without details and orphan book details", async () => {
    (
      deleteBooksWithoutDetails as jest.MockedFunction<
        typeof deleteBooksWithoutDetails
      >
    ).mockResolvedValueOnce(3);
    (
      deleteOrphanBookDetails as jest.MockedFunction<
        typeof deleteOrphanBookDetails
      >
    ).mockResolvedValueOnce(2);

    const response = await request(app).delete("/undetailed");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ deleted: 3, deleteDetails: 2 });
  });
});
