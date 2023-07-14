import request from "supertest";
import express from "express";
import { getAllBooksAndDetails } from "@services/books";
import router from "./books";

// Mock the specific module method
jest.mock("@services/books", () => ({
  getAllBooksAndDetails: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use(router);

describe("GET /", () => {
  it("should return all books and details", async () => {
    // Arrange
    const mockBooks = [
      {
        book_id: 80,
        book_details_id: 80,
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
      },
    ];

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
