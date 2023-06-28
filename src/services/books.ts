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
import {
  getAIbookDescription,
  getAIKeywords,
  getAiSubject,
} from "@services/openai";
import { getDetailsFromUser } from "@services/github";
import { delay } from "@utils/general";
import Logger from "@utils/logger";
import { Book, BookDetails, FreshBook } from "@ctypes/books";
import { BookMessage } from "@ctypes/discord";
import { BOOK_CHANNEL_ID } from "@config";

import { uniqBy } from "lodash";

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
  let query = db("books as b")
    .innerJoin("uploaders as u", "b.uploader_id", "u.uploader_id")
    .innerJoin("book_details as bd", "b.id", "bd.book_id")
    .leftJoin(
      db
        .select(
          db.raw("bk.book_id as book_id, GROUP_CONCAT(k.keyword) as keywords")
        )
        .from("book_keywords as bk")
        .innerJoin("keywords as k", "bk.keyword_id", "k.id")
        .groupBy("bk.book_id")
        .as("keywords_subquery"),
      "b.id",
      "keywords_subquery.book_id"
    )
    .orderBy("date", "desc")
    .select(
      "b.id as book_id",
      "bd.id as book_details_id",
      "b.uploader_id",
      "b.file",
      "b.date",
      "u.name",
      "u.avatar",
      "u.source",
      "bd.cover_image",
      "bd.title",
      "bd.author",
      "bd.subject",
      "bd.description",
      "keywords_subquery.keywords"
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
    const insertedKeywordObjects = await db("keywords").insert(
      newKeywords.map((k) => ({ keyword: k })),
      ["id", "keyword"]
    );
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

export {
  getAllBooks,
  getBooksWithoutDetails,
  getAllBooksAndDetails,
  getBooksWithNoSubjectNorDescription,
  getBooksWithoutKeywords,
  saveBook,
  getAllUploaders,
  getDateFromLatestBook,
  refreshBooks,
  handleBooksWithoutDetails,
  isRefreshing,
  addBooksFromGH,
  addSingleBookFromMessage,
  updateBookDescription,
  updateKeywords,
  updateBookSubject,
};
