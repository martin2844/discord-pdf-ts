import OpenAI from "openai";
import { OPENAI_KEY } from "@config";

import { BookDetails } from "@ctypes/books";

const openai = new OpenAI({
  apiKey: OPENAI_KEY, // This is the default and can be omitted
});

const getAIbookDescription = async (book: BookDetails) => {
  const aiResponse = await openai.completions.create({
    model: "gpt-4-0125-preview",
    prompt: `Give me a 50 words description about the book ${book.title} by ${book.author} in spanish, do not translate the title nor the author if you include it in the response`,
    max_tokens: 512,
  });
  return aiResponse.choices[0].text;
};

const getAIKeywords = async (book: BookDetails) => {
  const aiResponse = await openai.completions.create({
    model: "gpt-4-0125-preview",
    prompt: `Give me 5 keywords about the book ${book.title} by ${book.author}, keywords examples are 'java', 'php', 'machine-learning', 'ai', 'architecture', 'competitive programming', 'web dev', keywords should be of a general nature, dont give me very niche results, reply in a javascript array format like this ['keyword1', 'keyword2', 'keyword3']`,
    max_tokens: 512,
  });
  const keywordsString = aiResponse.choices[0].text;
  // Remove the square brackets and single quotes from the string
  const cleanString = keywordsString.replace(/[\[\]']+/g, "");
  // Split the string into an array
  const dataArray = cleanString.split(", ");
  // Remove leading newline character from each item in the array
  const cleanedArray = dataArray.map((item) => item.trim().replace(/^\n+/, ""));
  return cleanedArray;
};

const getAiSubject = async (book: BookDetails) => {
  const aiResponse = await openai.completions.create({
    model: "gpt-4-0125-preview",
    prompt: `Give me the main subject about the book ${book.title} by ${book.author}, should be the best word that describes what the book is about`,
    max_tokens: 512,
  });
  return aiResponse.choices[0].text;
};

export { getAIbookDescription, getAIKeywords, getAiSubject };
