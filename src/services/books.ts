import { uniqBy } from "lodash";
import db from "@db";
import { DiscordClient, fetchAllMessagesWithPdfs } from "@services/discord";

import { Book, BookDetails } from "@ctypes/books";
import { BookMessage } from "@ctypes/discord";

//Read
const getAllBooks = (): Promise<Book[]> => {
  return db("books").select("*");
};

const getBooksWithoutDetails = (): Promise<Book[]> => {
  return db("books")
    .leftJoin("book_details", "books.id", "book_details.book_id")
    .whereNull("book_details.book_id")
    .select("books.id", "books.file");
};

const getAllBooksAndDetails = (): Promise<(Book & BookDetails)[]> => {
  return db("books")
    .innerJoin("uploaders", "books.uploader_id", "uploaders.uploader_id")
    .innerJoin("book_details", "books.id", "book_details.book_id")
    .orderBy("date", "desc")
    .select("*");
};

const getAllUploaders = async () => {
  return db("uploaders").select("*");
};

const getDateFromLatestBook = async (): Promise<string | null> => {
  const result = await db("books")
    .select("date")
    .orderBy("date", "desc")
    .limit(1);

  return result[0]?.date || null;
};

const saveBook = async (book: Book): Promise<void> => {
  return db("books").insert({
    uploader_id: book.uploader_id,
    date: book.date,
    file: book.file,
  });
};

export async function saveBooks(books: Book[]) {
  return db("books").insert(books);
}

const mapBookMessagesToBooks = (bookMessages: BookMessage[]): Book[] => {
  return bookMessages.map((bookMessage) => {
    return {
      uploader_id: bookMessage.uploader_id,
      date: bookMessage.date,
      file: bookMessage.file,
    };
  });
};

const mapBookMessagesToMessageAuthors = (
  bookMessages: BookMessage[]
): { uploader_id: string; name: string }[] => {
  return uniqBy(
    bookMessages.map((bookMessage) => {
      return {
        uploader_id: bookMessage.author_id,
        name: bookMessage.author_tag,
      };
    }),
    (bm) => bm.uploader_id
  );
};

const refreshBooks = async () => {
  console.log("Refreshing Books");
  const client = await DiscordClient();
  console.log(`Ready! Logged in as ${client.user.tag}`);
  const channelId = "805973548924403722";
  const booksMessages = await fetchAllMessagesWithPdfs(
    channelId,
    null,
    await getDateFromLatestBook()
  );
  await saveBooks(mapBookMessagesToBooks(booksMessages));
  console.log("Books Refreshed");
  console.log(mapBookMessagesToMessageAuthors(booksMessages));
};

export {
  getAllBooks,
  getBooksWithoutDetails,
  getAllBooksAndDetails,
  getAllUploaders,
  getDateFromLatestBook,
  refreshBooks,
};
