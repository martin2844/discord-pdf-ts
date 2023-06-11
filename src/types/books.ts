export type Book = {
  uploader_id: string;
  date: string;
  file: string;
};

export type BookDetails = {
  id: number;
  book_id: number;
  // include all the other fields from your 'book_details' table
};
