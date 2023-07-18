import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import router from "./auth";

jest.mock("@config", () => ({
  API_PASSWORD: "password",
  JWT_SECRET: "secret",
}));

const app = express();
app.use(express.json());
app.use(router);

describe("POST /token", () => {
  const API_PASSWORD = "password";
  const JWT_SECRET = "secret";

  it("responds with a JWT if the correct password is provided", async () => {
    const response = await request(app)
      .post("/token")
      .send({ password: API_PASSWORD });

    // Check if the response has status 200
    expect(response.statusCode).toBe(200);

    // Check if the response body has property token
    expect(response.body).toHaveProperty("token");

    // Check if the token is a valid JWT
    const payload = jwt.verify(response.body.token, JWT_SECRET);
    expect(payload).toHaveProperty("authorized", true);
  });

  it("responds with status 401 if an incorrect password is provided", async () => {
    const response = await request(app)
      .post("/token")
      .send({ password: "wrong_password" }); // Use an incorrect password

    // Check if the response has status 401
    expect(response.statusCode).toBe(401);

    // Check if the response body contains the correct error message
    expect(response.body).toEqual({ message: "Invalid password" });
  });
});
