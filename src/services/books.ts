import { uniqBy } from "lodash";

import db from "@db";
import {
  DiscordClient,
  fetchAllMessagesWithPdfs,
  fetchAvatarsForUploaders,
} from "@services/discord";
import {
  checkIfUploaderExists,
  getUnexistingUploaders,
  saveUploaders,
} from "@services/uploaders";
import { getBookDetailsFromPdfUrl } from "@services/pdf";
import { delay } from "@utils/general";
import { Book, BookDetails, FreshBook } from "@ctypes/books";
import { BookMessage } from "@ctypes/discord";
import { getDetailsFromUser } from "./github";

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

const getDateFromLatestBook = async (): Promise<number | null> => {
  const result = await db("books")
    .select("date")
    .orderBy("date", "desc")
    .limit(1);

  return result[0] ? new Date(result[0].date).getTime() : null;
};

const saveBook = async (book: Book): Promise<void> => {
  return db("books").insert({
    uploader_id: book.uploader_id,
    date: book.date,
    file: book.file,
  });
};

const saveBooks = async (books: FreshBook[]) => {
  return db("books").insert(books);
};

const saveBookDetails = async (booksDetails: BookDetails[]): Promise<void> => {
  return db("book_details").insert(booksDetails);
};

const mapBookMessagesToBooks = (bookMessages: BookMessage[]): FreshBook[] => {
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

const pruneBooks = async (books: FreshBook[]) => {
  //Check if books exist in DB by searching for file, if they do, remove them from the array
  const existingBooks = await db("books")
    .whereIn(
      "file",
      books.map((book) => book.file)
    )
    .select("file");
  return books.filter((book) => {
    return !existingBooks.find(
      (existingBook) => existingBook.file === book.file
    );
  });
};

const fetchBooks = async () => {
  console.log("Refreshing Books");
  const client = await DiscordClient();
  console.log(`Ready! Logged in as ${client.user.tag}`);
  const channelId = "805973548924403722";
  const booksMessages = await fetchAllMessagesWithPdfs(
    channelId,
    null,
    await getDateFromLatestBook()
  );
  if (booksMessages.length === 0) {
    console.log("No Messages");
    return;
  }
  const books = await pruneBooks(mapBookMessagesToBooks(booksMessages));
  if (books) {
    await saveBooks(books);
  }
  return booksMessages;
};

const addSingleBookFromMessage = async (bookMessage: BookMessage) => {
  //1. check if uploader exists
  await fetchUploaders([bookMessage]);
  //2. save book
  await saveBooks(await pruneBooks(mapBookMessagesToBooks([bookMessage])));
  //4. fetch book details
  return handleBooksWithoutDetails();
};

// A function for fetching Discord uploaders
const fetchUploaders = async (booksMessages) => {
  const messageAuthors = mapBookMessagesToMessageAuthors(booksMessages);
  const newUploaders = await getUnexistingUploaders(
    messageAuthors.map((m) => ({ ...m, source: "discord" }))
  );
  if (newUploaders.length) {
    const uploaders = await fetchAvatarsForUploaders(newUploaders);
    await saveUploaders(uploaders);
  }
};

const handleMultipleBooksWithDelay = async (books) => {
  for (const book of books) {
    const details = await getBookDetailsFromPdfUrl(book);
    await saveBookDetails([details]);
    console.log("Delaying");
    await delay(250);
  }
};

// In memory tracking of refresh status, to prevent double hit;
// A more advance application would use something like redis redlock
let isRefreshing = false;

// A function for handling books without details
const handleBooksWithoutDetails = async () => {
  const booksWithoutDetails = await getBooksWithoutDetails();
  if (booksWithoutDetails.length > 5) {
    handleMultipleBooksWithDelay(booksWithoutDetails).then(
      () => (isRefreshing = false)
    );
    return "Refreshing books";
  }
  const bookDetailsPromises = booksWithoutDetails.map((b) =>
    getBookDetailsFromPdfUrl(b)
  );
  const bookDetails = await Promise.all(bookDetailsPromises);
  await saveBookDetails(bookDetails);
  isRefreshing = false;
  return "Refreshed books";
};

const refreshBooks = async () => {
  if (isRefreshing) {
    return "Already refreshing";
  }
  isRefreshing = true;
  const booksMessages = await fetchBooks();
  if (booksMessages) {
    await fetchUploaders(booksMessages);
    return await handleBooksWithoutDetails();
  }
  isRefreshing = false;
  return "Books up to date";
};

const addBooksFromGH = async (books: FreshBook[], repoUser: string) => {
  //1. Check if uploader exists
  const userExists = await checkIfUploaderExists(repoUser);
  //2. If not, create uploader
  if (!userExists) {
    //First get Github Details
    const details = await getDetailsFromUser(repoUser);
    await saveUploaders([details]);
  }
  //3. Save Books
  await saveBooks(books);
  //4. Save Book Details
  return handleBooksWithoutDetails();
};

export {
  getAllBooks,
  getBooksWithoutDetails,
  getAllBooksAndDetails,
  saveBook,
  getAllUploaders,
  getDateFromLatestBook,
  refreshBooks,
  isRefreshing,
  addBooksFromGH,
  addSingleBookFromMessage,
};
