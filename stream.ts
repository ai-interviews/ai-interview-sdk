import * as dotenv from "dotenv";
import express from "express";

import { Server } from "socket.io";
import { createServer } from "http";
import {
  SpeechConfig,
  AudioInputStream,
  AudioConfig,
  SpeechRecognizer,
  ResultReason,
  CancellationReason,
  AudioStreamFormat,
} from "microsoft-cognitiveservices-speech-sdk";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
  HumanMessagePromptTemplate,
} from "langchain/prompts";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { ConversationChain } from "langchain/chains";
import { BufferMemory } from "langchain/memory";

dotenv.config();

const endsWithPunctuation = (str: string) => {
  const punctuations = new Set(["!", "?", "."]);
  return punctuations.has(str[str.length - 1]);
};

const app = express();
const server = createServer(app);

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

const chain = new ConversationChain({
  memory: new BufferMemory({ returnMessages: true, memoryKey: "history" }),
  prompt: chatPrompt,
  llm: chat,
});

const speechConfig = SpeechConfig.fromSubscription(
  process.env.AZURE_CONGITIVE_SERVICES_SPEECH_KEY!,
  "eastus"
);
const pushStream = AudioInputStream.createPushStream(
  AudioStreamFormat.getWaveFormatPCM(48000, 16, 1)
);

const audioConfig = AudioConfig.fromStreamInput(pushStream);
const speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig);

speechRecognizer.recognizing = (s, e) => {
  // console.log(`RECOGNIZING: Text=${e.result.text}`);
};

speechRecognizer.recognized = (s, e) => {
  if (
    e.result.reason === ResultReason.RecognizedSpeech &&
    e.result.text.length > 1
  ) {
    (async () => {
      console.log("PROMPT:", e.result.text);

      const completion = await chain.call({
        input: e.result.text,
      });

      console.log("RESPONSE", completion.response);
    })();
  } else if (e.result.reason === ResultReason.NoMatch) {
    console.log("NOMATCH: Speech could not be recognized.", JSON.stringify(e));
  }
};

speechRecognizer.canceled = (s, e) => {
  console.log(`CANCELED: Reason=${e.errorDetails}`);

  if (e.reason === CancellationReason.Error) {
    console.log(`CANCELED: ErrorCode=${e.errorCode}`);
    console.log(`CANCELED: ErrorDetails=${e.errorDetails}`);
    console.log("CANCELED: Did you update the subscription info?");
  }

  speechRecognizer.stopContinuousRecognitionAsync();
};

speechRecognizer.speechEndDetected = (s, e) => {
  console.log("Speech has stopped being detected", JSON.stringify(e));
};

speechRecognizer.startContinuousRecognitionAsync(() => {
  console.log("speech recognition started");
});

function processAudioData(data: ArrayBuffer) {
  // console.log("Received audio data:", data);

  pushStream.write(data);
}

const io = new Server(server, {
  cors: {
    origin: "http://127.0.0.1:8080",
  },
});

io.on("connection", (socket) => {
  console.log("A client connected");

  socket.on("audioData", (data: ArrayBuffer) => {
    processAudioData(data);
  });

  socket.on("stopRecording", () => {
    console.log("Stop recording event received");

    socket.disconnect();
  });

  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

const PORT = 4200;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
