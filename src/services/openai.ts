import OpenAI from "openai";
import { OPENAI_KEY } from "@config";

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
        content: `Give me a 50-80 words description about the book ${book.title} by ${book.author} in Spanish. Do not translate the title nor the author if you include it in the response.`,
      },
    ],
    max_tokens: 512,
  });
  return aiResponse.choices[0].message.content;
};

const getAIKeywords = async (book: BookDetails) => {
  const aiResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: `Give me 5 keywords about the book ${book.title} by ${book.author}. Keywords examples are 'java', 'php', 'machine-learning', 'ai', 'architecture', 'competitive programming', 'web dev'. They are comparable to hashtags. Keywords should be of a general nature, don't give me very niche results. Reply in an array format like this ['keyword1', 'keyword2', 'keyword3'] Its imperative you always mantain this format.`,
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

export { getAIbookDescription, getAIKeywords, getAiSubject };
