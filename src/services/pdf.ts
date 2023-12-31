import fs from "fs";
import stream from "stream";
import { promisify } from "util";
import path from "path";

import axios from "axios";
import { fromBuffer } from "pdf2pic";
import { ToBase64Response } from "pdf2pic/dist/types/toBase64Response";
import PDFParser from "pdf-parse";

import { uploadToImgur } from "@services/imgur";
import { cloudinaryUpload } from "@services/cloudinary";
import { PdfError } from "@utils/errors";
import Logger from "@utils/logger";
import { Book, BookDetails } from "@ctypes/books";

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
    density: 100, // output pixels per inch
    savename: "untitled", // output file name
    savedir: "./images", // output file location
    format: "png", // output file format
    width: 600, // output width
    height: 900, // output height
  };
  const convert = fromBuffer(pdfBuffer, options);
  const picture: ToBase64Response = await convert(1, true);
  let coverUrl = await uploadToImgur(picture.base64);
  if (!coverUrl) coverUrl = await cloudinaryUpload(picture.base64);
  return coverUrl;
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

const getBookDetailsFromPdfUrl = async (book: Book): Promise<BookDetails> => {
  // Ensure tmp directory exists
  const tmpDir = path.join(__dirname, "./tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }

  // Path to store the downloaded PDF file
  const tempFilePath = path.join(tmpDir, `${book.id}.pdf`);

  // Download the PDF file from the URL in chunks and save it to a temporary file
  logger.info("Downloading PDF for book " + book.id);
  const response = await axios.get(book.file, {
    responseType: "stream",
  });

  // Save the stream to a file
  await pipeline(response.data, fs.createWriteStream(tempFilePath));

  // Read the downloaded PDF file from disk
  const pdfBuffer = fs.readFileSync(tempFilePath);

  // Check mime type
  await checkMimeType(pdfBuffer, book.id);

  // Get cover image
  const coverUrl = await storeAsImageAndGetCoverUrl(pdfBuffer);

  // Parse PDF data
  const pdf = await PDFParser(pdfBuffer);

  const { info } = pdf;

  // Delete the temporary file after use
  fs.unlinkSync(tempFilePath);

  return {
    book_id: book.id,
    author: info?.Author || "",
    title: info?.Title || "",
    subject: "",
    description: "",
    cover_image: coverUrl || "",
  };
};

export { getBookDetailsFromPdfUrl };
