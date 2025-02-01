import fs from "fs";
import stream from "stream";
import { promisify } from "util";
import path from "path";

import axios from "axios";
import { fromBuffer } from "pdf2pic";
import { ToBase64Response } from "pdf2pic/dist/types/toBase64Response";
import PDFParser from "pdf-parse";

import { PdfError } from "@utils/errors";
import Logger from "@utils/logger";
import { uploadBase64Image } from "@services/mateupload";
import { Book, BookDetails } from "@ctypes/books";
import { getAIbookDetailsFromText } from "./openai";

const logger = Logger(module);

/* Converting PDF to image with this lib requires two libraries:
ghostscript and graphicsmagick

Linux (Debian based)
For linux users, you can run the following commands on your terminal.

$ sudo apt-get update
$ sudo apt-get install ghostscript
$ sudo apt-get install graphicsmagick
Once everything is installed, the library should work as expected.

Mac OS
For rich people, you can run the following commands on your terminal.

$ brew update
$ brew install gs graphicsmagick
*/
const storeAsImageAndGetCoverUrl = async (
  pdfBuffer: Buffer
): Promise<string> => {
  const options = {
    density: 300,  // Increased for better quality
    savename: "untitled",
    savedir: "./images",
    format: "png",
    width: 600,
    height: 900,
    preserveAspectRatio: true,
    quality: 100,
    compression: "none",
    page: 1,
    imageType: "png"
  };

  try {
    // Ensure output directory exists
    if (!fs.existsSync(options.savedir)) {
      fs.mkdirSync(options.savedir, { recursive: true });
    }

    const convert = fromBuffer(pdfBuffer, options);
    const picture: ToBase64Response = await convert(1, true);

    // Add debug logging
    logger.info("PDF conversion complete");
    logger.info(`Base64 length: ${picture?.base64?.length || 0}`);

    if (!picture?.base64) {
      throw new Error("PDF conversion failed - no base64 data returned");
    }

    logger.info(`Base64 prefix: ${picture.base64.substring(0, 50)}...`);

    if (!picture.base64.startsWith('data:image/png;base64,')) {
      logger.warn("Base64 data missing proper PNG prefix");
      picture.base64 = `data:image/png;base64,${picture.base64}`;
    }

    const coverUrl = await uploadBase64Image(picture.base64);
    return coverUrl;
  } catch (error) {
    logger.error("Error converting PDF to image:", error);
    throw new PdfError(`Failed to convert PDF to image: ${error.message}`, null);
  }
};

//TODO Need to refactor, this is doubling the parsing.
const checkMimeType = async (pdfBuffer: Buffer, bookId: number) => {
  try {
    await PDFParser(pdfBuffer);
  } catch (error) {
    throw new PdfError("File is not a PDF", bookId);
  }
};

const pipeline = promisify(stream.pipeline);

const getBookDetailsFromPdfUrl = async (
  book: Book,
): Promise<BookDetails> => {
  // Ensure tmp directory exists
  const tmpDir = path.join(__dirname, "./tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }

  // Path to store the downloaded PDF file
  const tempFilePath = path.join(tmpDir, `${book.id}.pdf`);

  // Download the PDF file from the URL in chunks and save it to a temporary file
  logger.info("Downloading PDF for book " + book.id);
  const URL = await axios.get("http://localhost:4000/api/books/" + book.id + "/download");
  logger.info("Downloading PDF for book " + book.id + " from " + URL.data);
  const response = await axios.get(URL.data, {
    responseType: "stream",
  });
  const writer = fs.createWriteStream(tempFilePath);

  try {
    // Use pipeline with proper type assertions
    await pipeline(
      response.data,
      writer as unknown as NodeJS.WritableStream
    );
  } catch (error) {
    writer.destroy();
    fs.unlinkSync(tempFilePath);
    throw error;
  } finally {
    writer.end();
  }

  // Read the downloaded PDF file from disk
  const pdfBuffer = fs.readFileSync(tempFilePath);

  // Check mime type
  await checkMimeType(pdfBuffer, book.id);

  // Get cover image
  let coverUrl = "";
  if (!process.env.NO_IMAGE) {
    coverUrl = await storeAsImageAndGetCoverUrl(pdfBuffer);
  }

  // Parse PDF data
  const pdf = await PDFParser(pdfBuffer);

  const { info } = pdf;
  // if AI is enabled, send the PDF to the AI endpoint
  const aiDetails = {
    title: "",
    author: "",
    description: "",
    subject: "",
  };

  // extract first 1000 words from the book
  const extract = pdf.text.slice(0, 1500);
  const details = await getAIbookDetailsFromText(extract);
  try {
    const parsedDetails = JSON.parse(details);
    if (typeof parsedDetails === "string") {
      //parse again?
      console.log("Parsing again");
      const re = JSON.parse(parsedDetails);
      console.log(re);
      if (typeof re === "string") {
        console.log("Re Parsing failed");
      }
      aiDetails.title = re.title;
      aiDetails.author = re.author;
      aiDetails.description = re.description;
      aiDetails.subject = re.subject;
    } else {
      aiDetails.title = parsedDetails.title;
      aiDetails.author = parsedDetails.author;
      aiDetails.description = parsedDetails.description;
      aiDetails.subject = parsedDetails.subject;
    }
  } catch (error) {
    console.log("----> PARSING ERROR FROM AI :(");
    console.log(error);
  }

  // Delete the temporary file after use
  fs.unlinkSync(tempFilePath);
  return {
    book_id: book.id,
    author: aiDetails.author || info?.Author || "",
    title: aiDetails.title || info?.Title || "",
    subject: aiDetails.subject || "",
    description: aiDetails.description || "",
    cover_image: coverUrl,
  };
};

export { getBookDetailsFromPdfUrl };
