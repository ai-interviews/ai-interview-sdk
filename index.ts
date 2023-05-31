import * as dotenv from "dotenv";
import express from "express";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
  HumanMessagePromptTemplate,
} from "langchain/prompts";
import { ConversationChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";

/*
 * ============================================================
 *                      CONFIG
 * ============================================================
 */

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const chat = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-3.5-turbo",
});

const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    "The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know."
  ),
  new MessagesPlaceholder("history"),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);

/*
 * ============================================================
 *                      HELPERS
 * ============================================================
 */

const sendResponse = (res: any, data: any) => {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": true,
  } as any);
  res.end(JSON.stringify(data));
};

/*
 * ============================================================
 *                      ROUTES
 * ============================================================
 */

app.get("/", async (req, res) => {
  try {
    const chain = new ConversationChain({
      memory: new BufferMemory({ returnMessages: true, memoryKey: "history" }),
      prompt: chatPrompt,
      llm: chat,
    });

    await chain.call({
      input: "Hi from Toronto, are you able to help me today?",
    });

    const completion = await chain.call({
      input: "Do you know where I am?",
    });

    sendResponse(res, completion);
  } catch (e) {
    console.error(e);
    sendResponse(res, e);
  }
});

const PORT = 4200;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
