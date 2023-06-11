import db from "@db";
import { Book } from "@ctypes/books";

const addToBooksQueue = async (books: Book[]): Promise<void> => {
  const queueBooks = books.map((book) => {
    return {
      book_id: book.id,
      status: "pending",
    };
  });
  return db("book_queue").insert(queueBooks);
};

export { addToBooksQueue };
