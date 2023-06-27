export type Book = {
  id: number;
} & FreshBook;

export type FreshBook = {
  uploader_id: string;
  date: string;
  file: string;
};

export type BookDetails = {
  book_id: number;
  title: string;
  author: string;
  subject: string;
  description: string;
  cover_image: string;
};

export type BookWithDetail = Book & BookDetails;
