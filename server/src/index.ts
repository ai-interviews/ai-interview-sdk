import "dotenv/config";
import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import { initializeOpenAi } from "./openai.ts";
import { initializeSpeechToText, textToSpeech } from "./speech.ts";
import { Interviewer } from "./lib/interviewer.ts";
import { Metrics } from "./lib/metrics.ts";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", async (socket) => {
  console.log("A client connected");

  const metrics = new Metrics();

  // Conversational chain allows us to start a conversation with history
  const chain = initializeOpenAi();

  const interviewer = new Interviewer({
    chain,
    numQuestions: 3,
    candidateName: "Ralph",
  });

  await interviewer.init();

  textToSpeech({
    text: await interviewer.getNextQuestion(""),
    onAudioRecieved: (audioData) => {
      socket.emit("audioData", audioData);
    },
  });

  // Initialize speech recognition
  // Audio stream from the frontend directed into pushStream in this file
  // speechRecognizer applies speech recognition on data from pushStream
  let candidateResponse = "";
  const { pushStream, speechRecognizer } = initializeSpeechToText({
    onSpeechRecognized: (candidateResponseFragment) => {
      candidateResponse += candidateResponseFragment;
    },
    onSpeechRecognizing: () => {
      metrics.startAnswerTimer();
    },
  });

  // Start speech recognition
  speechRecognizer.startContinuousRecognitionAsync(() => {
    console.log("Speech recognition started.");
  });

  socket.on("audioData", (data: ArrayBuffer) => {
    pushStream.write(data);
  });

  socket.on("finishedSpeaking", async () => {
    if (!candidateResponse.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    metrics.endAnswerTimer();
    metrics.trackWordsFromResponse(candidateResponse);

    console.log("PROMPT:", candidateResponse);
    const response = await interviewer.getNextQuestion(candidateResponse);
    console.log("RESPONSE:", response);

    textToSpeech({
      text: response,
      onAudioRecieved: (audioData) => {
        socket.emit("audioData", audioData);
      },
    });

    candidateResponse = "";
  });

  socket.on("stopRecording", () => {
    // Stop speech recognition
    speechRecognizer.stopContinuousRecognitionAsync(() => {
      console.log("Speech recognition stopped.");
    });

    const { wordCount, answerTimesSeconds } = metrics;

    socket.emit("metrics", { wordCount, answerTimesSeconds });

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

app.get("/", (req, res) => {
  res.send("Hello from Server");
});
