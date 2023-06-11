import axios from "axios";
import PDFParser from "pdf-parse";

import { Book } from "@ctypes/books";

const getBookDetailsFromPdfUrl = async (book: Book) => {
  // Download the PDF file from the URL
  console.log("downloading pdf for book", book.id);
  const response = await axios.get(book.file, {
    responseType: "arraybuffer",
  });
  const pdfBuffer = response.data;
  // Parse PDF data
  const pdf = await PDFParser(pdfBuffer);
  const { info } = pdf;
  console.log("Returning info for PDF", book.id);
  return {
    book_id: book.id,
    author: info?.Author || "",
    title: info?.Title || "",
    subject: "",
    keywords: "",
  };
};

export { getBookDetailsFromPdfUrl };
