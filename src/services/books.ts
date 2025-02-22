import db from "@db";
import { DiscordClient, fetchAllMessagesWithPdfs } from "@services/discord";
import {
  checkIfUploaderExists,
  fetchUploaders,
  saveUploaders,
} from "@services/uploaders";
import { getBookDetailsFromPdfUrl } from "@services/pdf";
import {
  getAIbookDescription,
  getAIKeywords,
  getAiSubject,
} from "@services/openai";
import { getDetailsFromUser } from "@services/github";
import { PdfError } from "@utils/errors";
import Logger from "@utils/logger";
import { Book, BookDetails, FreshBook } from "@ctypes/books";
import { BookMessage } from "@ctypes/discord";
import { BOOK_CHANNEL_ID } from "@config";

import { uniqBy } from "lodash";
import { enqueueDetailsJob } from "./queue";
import { Uploader } from "@/types/uploaders";

const logger = Logger(module);

/**
 * Retrieves a book from the database by its ID.
 * @param {number} id - The ID of the book to retrieve.
 * @returns {Promise<Book>} - A promise that resolves to the retrieved book.
 */
const getBookById = (id: number): Promise<Book> => {
  return db("books").select("*").where("id", id).first();
};

/**
 * Deletes a book from the database by its ID.
 * @param {number} id - The ID of the book to delete.
 * @returns {Promise<number>} - A promise that resolves to the number of rows affected.
 */
const deleteBookById = (id: number): Promise<number> => {
  return db("books").where("id", id).del();
};

/**
 * Deletes all books from the database that do not have an entry in the books_details table.
 * @returns {Promise<number>} - A promise that resolves to the number of rows affected.
 */
const deleteBooksWithoutDetails = (): Promise<number> => {
  return db("books")
    .whereNotExists(
      db
        .select("*")
        .from("book_details")
        .whereRaw("books.id = book_details.book_id")
    )
    .del();
};

/**
 * Deletes all book_details from the database that do not have an associated book in the books table, or whose associated book has been deleted.
 * @returns {Promise<number>} - A promise that resolves to the number of rows affected.
 */
const deleteOrphanBookDetails = (): Promise<number> => {
  return db("book_details")
    .whereNotExists(
      db.select("*").from("books").whereRaw("book_details.book_id = books.id")
    )
    .del();
};

/**
 * Retrieves the number of books without details, the number of book_details without an associated book, and the number of books with details.
 * @returns {Promise<{completeBooks: number, booksWithoutDetails: number, orphanBookDetails: number}>} - A promise that resolves to an object containing the counts.
 */
const getBookCount = async (): Promise<{
  completeBooks: number | string;
  booksWithoutDetails: number | string;
  orphanBookDetails: number | string;
}> => {
  const booksWithoutDetails = await db("books")
    .whereNotExists(
      db
        .select("*")
        .from("book_details")
        .whereRaw("books.id = book_details.book_id")
    )
    .count("id as count");

  const orphanBookDetails = await db("book_details")
    .whereNotExists(
      db.select("*").from("books").whereRaw("book_details.book_id = books.id")
    )
    .count("book_id as count");

  const completeBooks = await db("books")
    .whereExists(
      db
        .select("*")
        .from("book_details")
        .whereRaw("books.id = book_details.book_id")
    )
    .count("id as count");

  return {
    completeBooks: completeBooks[0]?.count || 0,
    booksWithoutDetails: booksWithoutDetails[0]?.count || 0,
    orphanBookDetails: orphanBookDetails[0]?.count || 0,
  };
};

/**
 * Retrieves all books from the database that are not blacklisted.
 * @returns {Promise<Book[]>} - A promise that resolves to an array of all non-blacklisted books.
 */
const getAllBooks = (): Promise<Book[]> => {
  return db("books").select("*").where("blacklisted", false);
};

/**
 * Retrieves books from the database that do not have associated book details.
 * @returns {Promise<Book[]>} - A promise that resolves to an array of books without details.
 */
const getBooksWithoutDetails = (): Promise<Book[]> => {
  return db("books")
    .where("blacklisted", false)
    .leftJoin("book_details", "books.id", "book_details.book_id")
    .whereNull("book_details.book_id")
    .select("books.id", "books.file");
};

/**
 * Retrieves all books with their details.
 * @param {any} filters - Optional filters to apply to the query.
 * @returns {Promise<(Book & BookDetails)[]>} - A promise that resolves to an array of books with details.
 */
const getAllBooksAndDetails = (
  filters: any = {}
): Promise<(FreshBook & BookDetails)[]> => {
  let subquery = db
    .select(
      db.raw("bk.book_id as book_id, GROUP_CONCAT(k.keyword) as keywords")
    )
    .from("book_keywords as bk")
    .innerJoin("keywords as k", "bk.keyword_id", "k.id")
    .groupBy("bk.book_id")
    .as("keywords_subquery");

  let query = db("books as b")
    .where("b.blacklisted", false)
    .innerJoin("uploaders as u", "b.uploader_id", "u.uploader_id")
    .innerJoin("book_details as bd", "b.id", "bd.book_id")
    .leftJoin(
      db.select("*").from(subquery).as("keywords_subquery2"),
      "b.id",
      "keywords_subquery2.book_id"
    )
    .orderBy("date", "desc")
    .select(
      "b.id as book_id",
      "bd.id as book_details_id",
      "b.uploader_id",
      "b.file",
      "b.downloads",
      "b.date",
      "u.name",
      "u.avatar",
      "u.source",
      "bd.cover_image",
      "bd.title",
      "bd.author",
      "bd.subject",
      "bd.description",
      "keywords_subquery2.keywords"
    );

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
  ];

  validFilters.forEach((filter) => {
    if (filters[filter]) {
      query = query.where(filter, filters[filter]);
    }
  });

  // Handle 'id' and 'uploader_id' filter separately because they exist in more than one table.
  if (filters.id) {
    query = query.where("b.id", filters.id);
  }

  if (filters.uploader_id) {
    query = query.where("b.uploader_id", filters.uploader_id);
  }

  // Filter by keyword
  if (filters.keywords) {
    query = query.whereRaw(`keywords_subquery2.keywords LIKE ?`, [
      `%${filters.keywords}%`,
    ]);
  }

  return query;
};

/**
 * Retrieves a single book with its details.
 * @param {number} bookId - ID of the book to fetch.
 * @returns {Promise<(Book & BookDetails) | null>} - A promise that resolves to a book with details or null.
 */
const getBookAndDetails = async (
  bookId: number
): Promise<(FreshBook & BookDetails) | null> => {
  let subquery = db
    .select(
      db.raw("bk.book_id as book_id, GROUP_CONCAT(k.keyword) as keywords")
    )
    .from("book_keywords as bk")
    .innerJoin("keywords as k", "bk.keyword_id", "k.id")
    .groupBy("bk.book_id")
    .as("keywords_subquery");

  let query = db("books as b")
    .where("b.id", bookId) // Filter by the provided bookId
    .where("b.blacklisted", false)
    .where("bd.author", "<>", "")
    .where("bd.title", "<>", "")
    .where("bd.subject", "<>", "")
    .innerJoin("uploaders as u", "b.uploader_id", "u.uploader_id")
    .innerJoin("book_details as bd", "b.id", "bd.book_id")
    .leftJoin(
      db.select("*").from(subquery).as("keywords_subquery2"),
      "b.id",
      "keywords_subquery2.book_id"
    )
    .orderBy("date", "desc")
    .select(
      "b.id as book_id",
      "bd.id as book_details_id",
      "b.uploader_id",
      "b.file",
      "b.downloads",
      "b.date",
      "u.name",
      "u.avatar",
      "u.source",
      "bd.cover_image",
      "bd.title",
      "bd.author",
      "bd.subject",
      "bd.description",
      "keywords_subquery2.keywords"
    )
    .first(); // Fetch only the first record that matches the given bookId

  return query;
};

/**
 * Retrieves the date from the latest book.
 * @returns {Promise<number | null>} - A promise that resolves to the date (in milliseconds) of the latest book, or null if no books exist.
 */
const getDateFromLatestBook = async (): Promise<number | null> => {
  const result = await db("books")
    .where("blacklisted", false)
    .select("date")
    .orderBy("date", "desc")
    .limit(1);

  return result[0] ? new Date(result[0].date).getTime() : null;
};

/**
 * Saves multiple books.
 * @param {FreshBook[]} books - An array of fresh books to be saved.
 * @returns {Promise<void>} - A promise that resolves once the books are saved.
 */
const saveBooks = async (books: FreshBook[]) => {
  return db("books").insert(books);
};

/**
 * Saves book details.
 * @param {BookDetails[]} booksDetails - An array of book details objects to be saved.
 * @returns {Promise<void>} - A promise that resolves once the book details are saved.
 */
const saveBookDetails = async (booksDetails: BookDetails[]): Promise<void> => {
  for (let bookDetails of booksDetails) {
    // Check if book details already exist
    const existingBookDetails = await db("book_details")
      .where("book_id", bookDetails.book_id)
      .select("*");
    if (existingBookDetails.length) {
      // replace existing book details with new ones
      await db("book_details")
        .where("book_id", bookDetails.book_id)
        .update(bookDetails);
    } else {
      // insert new book details
      await db("book_details").insert(bookDetails);
    }
  }
};

/**
 * Updates a books download count by 1
 * @param {number} bookId - The ID of the book to update.
 * @returns {Promise<any>} - A promise that resolves once the book is updated.
 */
const addDownloadCountToBook = async (bookId: number): Promise<any> => {
  return db("books").where("id", bookId).increment("downloads", 1);
};

/**
 * Maps an array of book messages to an array of fresh books.
 * @param {BookMessage[]} bookMessages - An array of book messages to be mapped.
 * @returns {FreshBook[]} - An array of fresh books mapped from the book messages.
 */
const mapBookMessagesToBooks = (bookMessages: BookMessage[]): FreshBook[] => {
  return bookMessages.map((bookMessage) => {
    return {
      uploader_id: bookMessage.uploader_id,
      date: bookMessage.date,
      file: bookMessage.file,
      message_id: bookMessage.message_id,
    };
  });
};

/**
 * Maps an array of book messages to an array of message authors.
 * @param {BookMessage[]} bookMessages - An array of book messages to be mapped.
 * @returns {{ uploader_id: string; name: string }[]} - An array of message authors mapped from the book messages.
 */
const mapBookMessagesToMessageAuthors = (
  bookMessages: BookMessage[]
): Uploader[] => {
  return uniqBy(
    bookMessages.map((bookMessage) => {
      return {
        uploader_id: bookMessage.author_id,
        name: bookMessage.author_tag,
        source: "discord",
      };
    }),
    (bm) => bm.uploader_id
  );
};

/**
 * Safety function that checks if books exist in DB before saving them.
 * @param {FreshBook[]} books - An array of books to be pruned.
 * @returns {Promise<FreshBook[]>} - A promise that resolves to an array of pruned books.
 */
const pruneBooks = async (books: FreshBook[]) => {
  //First filter books Array to remove files that are repeated in the array
  books = uniqBy(books, (book) => book.file);
  //Check if books exist in DB by searching for file, if they do, remove them from the array
  const existingBooks = await db("books")
    .where("blacklisted", false)
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

/**
 * Makes a book blacklisted.
 * @param {number} bookId - The ID of the book to be blacklisted.
 * @returns {Promise<number>} - A promise that resolves to the number of updated records.
 */
const blacklistBook = async (bookId: Number) => {
  return db("books")
    .where("blacklisted", false)
    .where("id", bookId)
    .update({ blacklisted: true });
};

/**
 * Modifies a book in the database.
 * @param {number} bookId - The ID of the book to modify.
 * @param {Partial<FreshBook>} updates - An object with the fields to update.
 * @returns {Promise<number>} - A promise that resolves to the number of updated records.
 */
const modifyBook = async (
  bookId: number,
  updates: Partial<FreshBook & BookDetails>
): Promise<number> => {
  const validUpdates = ["uploader_id", "file", "date"];
  const bookUpdates = {};
  const bookDetailsUpdates = {};
  const validBookDetailsUpdates = [
    "title",
    "author",
    "subject",
    "description",
    "keywords",
    "cover_url",
  ];

  validUpdates.forEach((update) => {
    if (updates[update] !== undefined) {
      bookUpdates[update] = updates[update];
    }
  });

  validBookDetailsUpdates.forEach((update) => {
    if (updates[update] !== undefined) {
      bookDetailsUpdates[update] = updates[update];
    }
  });

  let booksUpdateResult;

  if (Object.keys(bookUpdates).length) {
    booksUpdateResult = await db("books")
      .where("id", bookId)
      .update(bookUpdates);
  }

  const bookDetail = await db("book_details").where("book_id", bookId).first();
  const bookDetailsId = bookDetail ? bookDetail.id : null;

  let bookDetailsUpdateResult = 0;

  if (bookDetailsId !== null && Object.keys(bookDetailsUpdates).length) {
    bookDetailsUpdateResult = await db("book_details")
      .where("id", bookDetailsId)
      .update(bookDetailsUpdates);
  }

  return booksUpdateResult && bookDetailsUpdateResult;
};

/**
 * Fetches fresh books and their associated book messages.
 * @returns {Promise<{ books: FreshBook[], booksMessages: BookMessage[] }>} - A promise that resolves to an object containing the fetched books and their associated book messages.
 */
const fetchBooks = async (): Promise<{
  books: FreshBook[];
  booksMessages: BookMessage[];
}> => {
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
    return {
      books: [],
      booksMessages: [],
    };
  }
  const books = await pruneBooks(mapBookMessagesToBooks(booksMessages));
  return {
    books,
    booksMessages,
  };
};

/**
 * Adds a single book from a book message.
 * @param {BookMessage} bookMessage - The book message containing the book to be added.
 * @returns {Promise<void>} - A promise that resolves once the book is added and book details are fetched.
 */
const addBooksFromMessage = async (booksMessages: BookMessage[]) => {
  if (!booksMessages || booksMessages.length === 0) {
    console.log("No books to process");
    return "No books to process";
  }

  // First check if any of these books already exist
  const existingBooks = await db("books")
    .whereIn(
      "file",
      booksMessages.map((book) => book.file)
    )
    .select("file");

  console.log("Existing Books: " + existingBooks.length);

  // Filter out existing books
  const newBooks = booksMessages.filter(
    (book) => !existingBooks.find((existing) => existing.file === book.file)
  );
  console.log("New Books: " + newBooks.length);

  if (newBooks.length === 0) {
    return "All books already exist";
  }

  // Map the books to the correct format
  const books = newBooks.map((book) => ({
    uploader_id: book.uploader_id,
    file: book.file,
    message_id: book.message_id,
    date: book.date,
  }));

  console.log("Books: " + books.length);
  // Insert the new books
  if (books.length > 0) {
    console.log("Inserting books");
    await db("books").insert(books);
    console.log("Inserted books");
    // Fetch uploaders after saving books
    console.log("Fetching uploaders");
    await fetchUploaders(mapBookMessagesToMessageAuthors(booksMessages));
    // After saving enqueue book details jobs
    console.log("Enqueuing book details jobs");
    await enqueueBooksWithoutDetails();
    return `Enqueued jobs for ${books.length} books`;
  }

  return "No new books to add";
};

/**
 * Gets a book from the database and saves its details, including the cover image.
 * @param {number} bookId - The ID of the book to fetch and save details for.
 * @returns {Promise<BookDetails>} - A promise that resolves to the saved book details.
 * @throws {Error} - If the book is not found or an error occurs during the process.
 */
const sourceAndSaveBookDetails = async (bookId: number) => {
  const book = await getBookById(bookId);
  if (!book) {
    throw new Error("Book not found");
  }
  try {
    const details = await getBookDetailsFromPdfUrl(book);
    if (
      !details.description ||
      !details.title ||
      !details.author ||
      !details.subject
    ) {
      console.log(details);
      logger.error(
        `Book Details Missing Title, Author or Subject for book id ${bookId}`
      );
      return;
    }
    await saveBookDetails([details]);
    return details;
  } catch (error) {
    if (error instanceof PdfError) {
      logger.error(
        `Incorrect PDF for book id ${error.bookId} while executing sourceAndSaveBookDetails`
      );
      await blacklistBook(error.bookId);
    } else {
      throw error;
    }
  }
};

/**
 * Enqueues a job for each book without details to fetch the details later via a worker.
 * @returns {Promise<string>} - A promise that resolves to a message indicating the result of the enqueueing process.
 */
const enqueueBooksWithoutDetails = async () => {
  try {
    const booksWithoutDetails = await getBooksWithoutDetails();
    console.log("Books without details: " + booksWithoutDetails.length);
    const bookDetailsPromises = booksWithoutDetails.map((b) =>
      enqueueDetailsJob(b.id)
    );
    console.log("Enqueuing book details jobs");
    await Promise.all(bookDetailsPromises);
    console.log("Enqueued book details jobs");
    return "Enqueued jobs for books without details";
  } catch (error) {
    if (error instanceof PdfError) {
      logger.error(
        `Incorrect PDF for book id ${error.bookId} while executing Promise.all in handleBooksWithoutDetails`
      );
      await blacklistBook(error.bookId);
    }
    if (error.message) {
      logger.error("Error while downloading book: " + error.message);
    }
  }
};

/**
 * Sources books from unread Discord messages and saves them to the database. It also saves the uploaders.
 * @returns {Promise<string>} - A promise that resolves to a message indicating the result of the refresh process.
 */
const refreshBooks = async () => {
  const { booksMessages, books } = await fetchBooks();
  if (books.length) {
    await saveBooks(books);
    //Save books if there are
    await fetchUploaders(mapBookMessagesToMessageAuthors(booksMessages));
    //After saving enqueue book details jobs
    await enqueueBooksWithoutDetails();
    return `Enqueued jobs for ${books.length} books`;
  }
  return "Up To date";
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
  return enqueueBooksWithoutDetails();
};

/**
 * Updates the description of a book in the database based on specific conditions.
 * @param {number} bookId - The ID of the book to update the description for.
 * @returns {Promise<string>} - A promise that resolves to a string indicating the result of the update operation.
 */
const updateBookDescription = async (bookId: number) => {
  // Fetch book with specific conditions
  const book = await db("book_details")
    .where({
      book_id: bookId,
      description: "", // Empty description
    })
    .whereNotNull("author") // Non-null author
    .andWhere("author", "<>", "") // Non-empty author
    .whereNotNull("title") // Non-null title
    .andWhere("title", "<>", "") // Non-empty title
    .first()
    .select("*");

  if (!book) {
    return "Book not found or conditions not met for updating book description.";
  }

  // Get AI-generated book description
  const description = await getAIbookDescription(book);
  const cleanDesc = description.replace(/(\r\n|\n|\r)/gm, " ").trim();

  // Update book description in the database
  await db("book_details")
    .where("book_id", bookId)
    .update({ description: cleanDesc });

  return "Book description updated.";
};

/**
 * Updates the keywords of a book in the database based on specific conditions.
 * @param {number} bookId - The ID of the book to update the keywords for.
 * @returns {Promise<string>} - A promise that resolves to a string indicating the result of the update operation.
 */
const updateKeywords = async (bookId: number) => {
  // Step 1: Search for the book in the DB
  const book = await db("book_details")
    .where("book_id", bookId)
    .first()
    .select("*");
  if (!book) {
    return "Book not found";
  }
  if (!book.title || !book.author) {
    logger.error("Souldnt fetch keywords for book without title or author");
    return "Book Missing Title or Author";
  }
  // Step 2: Check if the book has associated keywords with it
  const existingKeywords = await db("book_keywords")
    .where("book_id", bookId)
    .select("keyword_id");
  // Step 3: If not, get keywords from the function getAIKeywords
  if (existingKeywords.length === 0) {
    const keywords = await getAIKeywords(book);
    // Step 4: getAIKeywords returns an array of keywords for that book, it should check the DB and see if those keywords exist
    // If they don't, it should add them.
    const existingKeywordObjects = await db("keywords")
      .whereIn("keyword", keywords)
      .select("*");
    const existingKeywordNames = existingKeywordObjects.map((k) => k.keyword);
    const newKeywords = keywords.filter(
      (k) => !existingKeywordNames.includes(k)
    );
    // Insert new keywords
    const insertedKeywordObjects = [];
    for (let keyword of newKeywords) {
      const existingKeyword = await db("keywords")
        .where("keyword", keyword)
        .first();
      if (!existingKeyword) {
        const [insertedKeyword] = await db("keywords").insert(
          { keyword: keyword },
          ["id", "keyword"]
        );
        insertedKeywordObjects.push(insertedKeyword);
      } else {
        insertedKeywordObjects.push(existingKeyword);
      }
    }
    // Combine existing and newly inserted keywords
    const allKeywordObjects = [
      ...existingKeywordObjects,
      ...insertedKeywordObjects,
    ];
    // Step 5: Finally, add all of the applicable keywords for that book to the book_keywords table.
    const keywordAssociations = allKeywordObjects.map((k) => ({
      book_id: bookId,
      keyword_id: k.id,
    }));
    await db("book_keywords").insert(keywordAssociations);
  }
  return "Keywords updated for the book.";
};

/**
 * Updates the subject of a book in the database based on specific conditions.
 * @param {number} bookId - The ID of the book to update the subject for.
 * @returns {Promise<string>} - A promise that resolves to a string indicating the result of the update operation.
 */
const updateBookSubject = async (bookId: number) => {
  // Step 1: Search for the book in the DB
  const book = await db("book_details")
    .where({
      book_id: bookId,
      subject: "",
    })
    .whereNotNull("author") // Non-null author
    .andWhere("author", "<>", "") // Non-empty author
    .whereNotNull("title") // Non-null title
    .andWhere("title", "<>", "") // Non-empty title
    .first()
    .select("*");

  if (!book) {
    return "Book not found or conditions not met for updating book subject.";
  }

  // Get AI-generated book subject
  const subject = await getAiSubject(book);

  // Update book subject in the database
  await db("book_details")
    .where("book_id", bookId)
    .update({ subject: subject.trim() });

  return "Book subject updated.";
};

/**
 * Retrieves the book IDs of books that have no subject or description in the database based on specific conditions.
 * @returns {Promise<number[]>} - A promise that resolves to an array of book IDs.
 */
const getBooksWithNoSubjectNorDescription = async (): Promise<number[]> => {
  const bookIds = await db("book_details")
    .where((builder) => {
      builder
        .whereNull("subject")
        .orWhere("subject", "")
        .whereNull("description")
        .orWhere("description", "");
    })
    .whereNotNull("author")
    .andWhere("author", "<>", "")
    .whereNotNull("title")
    .andWhere("title", "<>", "")
    .pluck("book_id");
  return bookIds;
};

/**
 * Retrieves the book IDs of books that have no associated keywords in the database based on specific conditions.
 * @returns {Promise<number[]>} - A promise that resolves to an array of book IDs.
 */
const getBooksWithoutKeywords = async (): Promise<number[]> => {
  const bookIds = await db("book_details")
    .leftJoin("book_keywords", "book_details.book_id", "book_keywords.book_id")
    .whereNull("book_keywords.keyword_id")
    .whereNotNull("book_details.author")
    .andWhere("book_details.author", "<>", "")
    .whereNotNull("book_details.title")
    .andWhere("book_details.title", "<>", "")
    .groupBy("book_details.book_id")
    .pluck("book_details.book_id");
  return bookIds;
};

const getKeywords = async () => {
  const keywords = await db("keywords").select("*");
  return keywords;
};

export {
  getAllBooks,
  getBookById,
  getBookCount,
  deleteBookById,
  deleteBooksWithoutDetails,
  deleteOrphanBookDetails,
  getBooksWithoutDetails,
  getAllBooksAndDetails,
  getBooksWithNoSubjectNorDescription,
  getBooksWithoutKeywords,
  getBookAndDetails,
  addDownloadCountToBook,
  blacklistBook,
  modifyBook,
  getDateFromLatestBook,
  refreshBooks,
  enqueueBooksWithoutDetails,
  sourceAndSaveBookDetails,
  addBooksFromGH,
  addBooksFromMessage,
  updateBookDescription,
  updateKeywords,
  updateBookSubject,
  getKeywords,
};
