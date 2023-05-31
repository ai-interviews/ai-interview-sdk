import * as dotenv from "dotenv";

dotenv.config();

import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import { initializeOpenAi } from "./openai";
import { initializeSpeechToText, initializeTextToSpeech } from "./speech";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://127.0.0.1:8080",
  },
});

io.on("connection", (socket) => {
  console.log("A client connected");

  // Conversational chain allows us to start a conversation with history
  const chain = initializeOpenAi();

  const { pushStream, speechRecognizer } = initializeSpeechToText({
    onSpeechRecognized: (text) => {
      (async () => {
        console.log("PROMPT:", text);

        const completion = await chain.call({
          input: text,
        });

        const response = completion.response as string;

        console.log("RESPONSE", response);

        initializeTextToSpeech({
          text: response,
          onAudioRecieved: (audioData) => {
            socket.emit("audioData", audioData);
          },
        });
      })();
    },
  });

  // Start accepting streams of speech
  speechRecognizer.startContinuousRecognitionAsync(() => {
    console.log("Speech recognition started.");
  });

  socket.on("audioData", (data: ArrayBuffer) => {
    pushStream.write(data);
  });

  socket.on("stopRecording", () => {
    // Stop recording streams of speech
    speechRecognizer.stopContinuousRecognitionAsync(() => {
      console.log("Speech recognition stopped.");
    });

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
