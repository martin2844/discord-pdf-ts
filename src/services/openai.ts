import OpenAI from "openai";
import { OPENAI_KEY } from "@config";
import { getKeywords } from "@services/books";

import { BookDetails } from "@ctypes/books";

const openai = new OpenAI({ apiKey: OPENAI_KEY });

const getAIbookDescription = async (book: BookDetails) => {
  const aiResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: `Give me a 50-80 words description about the book ${book.title} by ${book.author} in Spanish. Do not translate the title nor the author if you include it in the response. Be Direct, concise and to the point. Avoid saying "The book is about..." or "The book is a...". Just directly describe the book: Begginers guide for python... etc instead of this book is a begginers guide for python.`,
      },
    ],
    max_tokens: 512,
  });
  return aiResponse.choices[0].message.content;
};

const getAIbookDetailsFromText = async (text: string) => {
  const aiResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: `I will send you a text from a book. Please provide me with the title, author of the book and a brief description of the book in Spanish, also give me the subject of the book in english for example: "Data Science" or "Javascript", this needs to be in English. The description should be in Spanish. The title and author should not be translated. The description should be 50-80 words long. Do not start the description with "The book is about..." or "The book is a...". Be concise, we know you're talking about a book, so instead of saying "The book is a begginers guide for python" just say "Begginners guide for python..". Return the reply in JSON format like so "{ "title": "title", "author": "author", "description": "description", subject: "subject" }". If you can't find the title or author, return an empty string. If you can't find the description, return an empty string. Never deviate from returning a JSON, do not add any markdown blocks, just a string, do not add any other words or characters. This is the text: ${text}`,
      },
    ],
    max_tokens: 512,
  });
  return aiResponse.choices[0].message.content;
};

const getAIKeywords = async (book: BookDetails) => {
  const keywords = await getKeywords();
  const aiResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: `Give me 2 keywords about the book ${book.title} by ${book.author}. Keywords examples are 'java', 'php', 'machine-learning', 'ai', 'architecture', 'competitive programming', 'web dev'. They are comparable to hashtags. Keywords should be of a general nature, don't give me very niche results. Reply in an array format like this ['keyword1', 'keyword2', 'keyword3'] Its imperative you always mantain this format. This are the current keywords we have: ${keywords.map((k) => k.keyword).join(", ")}. Try to avoid creating new ones please. If you cant find or provide any keywords, return an empty array.`,
      },
    ],
    max_tokens: 512,
  });
  const keywordsString = aiResponse.choices[0].message.content;
  // Remove the square brackets and single quotes from the string
  const cleanString = keywordsString.replace(/[\[\]']+/g, "");
  // Split the string into an array
  const dataArray = cleanString.split(", ");
  // Remove leading newline character from each item in the array
  const cleanedArray = dataArray.map((item) => item.trim().replace(/^\n+/, ""));
  return cleanedArray;
};

const getAiSubject = async (book: BookDetails) => {
  const aiResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: `Give me the main subject about the book ${book.title} by ${book.author}. It should be the best word that describes what the book is about. Only one word is expected`,
      },
    ],
    max_tokens: 512,
  });
  return aiResponse.choices[0].message.content;
};

export {
  getAIbookDescription,
  getAIKeywords,
  getAiSubject,
  getAIbookDetailsFromText,
};
