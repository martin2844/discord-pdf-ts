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
import { getDetailsFromUser } from "@services/github";
import { delay } from "@utils/general";
import Logger from "@utils/logger";
import { Book, BookDetails, FreshBook } from "@ctypes/books";
import { BookMessage } from "@ctypes/discord";
import { BOOK_CHANNEL_ID } from "@config";

const logger = Logger(module);

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

const getAllBooksAndDetails = (
  filters: any = {}
): Promise<(Book & BookDetails)[]> => {
  let query = db("books")
    .innerJoin("uploaders", "books.uploader_id", "uploaders.uploader_id")
    .innerJoin("book_details", "books.id", "book_details.book_id")
    .orderBy("date", "desc");

  // Safe list of filters.
  const validFilters = [
    "file",
    "date",
    "name",
    "avatar",
    "source",
    "book_id",
    "cover_image",
    "title",
    "author",
    "subject",
    "keywords",
  ];

  validFilters.forEach((filter) => {
    if (filters[filter]) {
      query = query.where(filter, filters[filter]);
    }
  });

  // Handle 'id' and 'uploader_id' filter separately because they exist in more than one table.
  if (filters.id) {
    query = query.where("books.id", filters.id);
  }

  if (filters.uploader_id) {
    query = query.where("books.uploader_id", filters.uploader_id);
  }

  return query.select("*");
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
  const client = await DiscordClient();
  logger.info(
    `Ready! Logged in as ${client.user.tag} at ${BOOK_CHANNEL_ID} and about to FETCH fresh books`
  );
  const booksMessages = await fetchAllMessagesWithPdfs(
    BOOK_CHANNEL_ID,
    null,
    await getDateFromLatestBook()
  );
  if (booksMessages.length === 0) {
    logger.info("No Messages");
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
    logger.info("Delaying Download of next book");
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
  if (!booksMessages) {
    //If no books message, check if there are any books without cover
    const booksWithoutCover = await booksWithoutCoverImages();
    if (booksWithoutCover.length) {
      //If there are books without cover, update them
      updateCoverImages(booksWithoutCover).then(() => (isRefreshing = false));
      return "Refreshing Cover images";
    }
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

const booksWithoutCoverImages = async () => {
  // Get book details without cover images (limit to 5)
  const booksToUpdate = await db("book_details")
    .where("cover_image", "")
    .limit(5)
    .select("*");
  return booksToUpdate;
};

const updateCoverImages = async (booksToUpdate) => {
  // For each book
  for (const book of booksToUpdate) {
    // Get book object to use for getBookDetailsFromPdfUrl function
    const bookObject = await db("books").where("id", book.book_id).first();
    // Fetch book details
    const newBookDetails = await getBookDetailsFromPdfUrl(bookObject);
    // Update book details in the database
    await db("book_details").where("book_id", book.book_id).update({
      cover_image: newBookDetails.cover_image,
    });
    logger.info(`Updated cover image for book ${book.book_id}`);
    await delay(250);
  }

  // If there are still books to update, function can be run again
  const remainingBooksCount = await db("book_details")
    .whereNull("cover_image")
    .count("book_id as count");

  const remainingBooksCountNumber = Number(remainingBooksCount[0].count);

  if (remainingBooksCountNumber > 0) {
    logger.info(
      `${remainingBooksCount[0].count} books remaining to update. Run the function again.`
    );
  } else {
    logger.info(`All books are updated.`);
  }
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
