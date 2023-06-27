import { Configuration, OpenAIApi } from "openai";
import { OPENAI_KEY } from "@config";

import { BookDetails } from "@ctypes/books";

const configuration = new Configuration({
  apiKey: OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

const getAIbookDescription = async (book: BookDetails) => {
  const aiResponse = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `Give me a 50 words description about the book ${book.title} by ${book.author} in spanish, do not translate the title nor the author if you include it in the response`,
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  return aiResponse.data.choices[0].text;
};

const getAIKeywords = async (book: BookDetails) => {
  const aiResponse = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `Give me 5 keywords about the book ${book.title} by ${book.author}, keywords examples are 'java', 'php', 'machine-learning', 'ai', 'architecture', 'competitive programming', 'web dev', keywords should be of a general nature, dont give me very niche results, reply in a javascript array format like this ['keyword1', 'keyword2', 'keyword3']`,
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  const keywordsString = aiResponse.data.choices[0].text;
  // Remove the square brackets and single quotes from the string
  const cleanString = keywordsString.replace(/[\[\]']+/g, "");
  // Split the string into an array
  const dataArray = cleanString.split(", ");
  // Remove leading newline character from each item in the array
  const cleanedArray = dataArray.map((item) => item.trim().replace(/^\n+/, ""));
  return cleanedArray;
};

const getAiSubject = async (book: BookDetails) => {
  const aiResponse = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `Give me the main subject about the book ${book.title} by ${book.author}, should be the best word that describes what the book is about`,
    temperature: 1,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });
  return aiResponse.data.choices[0].text;
};

export { getAIbookDescription, getAIKeywords, getAiSubject };
