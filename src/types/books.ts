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

//A chat message that contains a PDF
export type BookMessage = {
  uploader_id: string;
  date: string;
  file: string;
  author_id: string;
  author_tag: string;
};

export type BookWithDetail = Book & BookDetails;
