import "dotenv/config";
import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import { initializeSpeechToText, textToSpeech } from "./lib/speech.ts";
import { Interviewer } from "./lib/interviewer.ts";
import { Metrics } from "./lib/metrics.ts";
import { emitToSocket } from "./lib/emitToSocket.ts";

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
  const interviewer = new Interviewer({
    numRequiredQuestions: 3,
    candidateName: "Ralph",
  });

  await interviewer.init();

  // Ask ice-breaker question to candidate
  const openerQuestion = await interviewer.getNextQuestion("");
  const openerAudioData = await textToSpeech({
    text: openerQuestion,
  });

  // Emit opener questin to client
  emitToSocket(socket, {
    event: "audio",
    data: {
      text: openerQuestion,
      buffer: openerAudioData,
    },
  });

  // Audio stream from the frontend to be directed into pushStream
  let candidateResponse = "";
  const { pushStream, speechRecognizer } = initializeSpeechToText({
    onSpeechRecognized: (candidateResponseFragment) => {
      candidateResponse += " " + candidateResponseFragment;

      emitToSocket(socket, {
        event: "speechRecognized",
        data: {
          text: candidateResponse,
        },
      });
    },
    onSpeechRecognizing: (text: string) => {
      metrics.startAnswerTimer();

      emitToSocket(socket, {
        event: "speechRecognized",
        data: {
          text: candidateResponse + text,
        },
      });
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

    if (!candidateResponse.length) {
      console.log("No speech detected.");
      return;
    }

    // Track metrics from this response
    const answerTimeSeconds = metrics.endAnswerTimer();
    const wordCount = metrics.trackWordsFromResponse(candidateResponse);

    emitToSocket(socket, {
      event: "responseMetrics",
      data: { wordCount, answerTimeSeconds },
    });

    console.log("PROMPT:", candidateResponse);

    const nextQuestionForCandidate = await interviewer.getNextQuestion(
      candidateResponse
    );

    console.log("RESPONSE:", nextQuestionForCandidate);

    const audioData = await textToSpeech({ text: nextQuestionForCandidate });

    emitToSocket(socket, {
      event: "audio",
      data: {
        text: nextQuestionForCandidate,
        buffer: audioData,
      },
    });

    // Reset candidate response
    candidateResponse = "";
  });

  socket.on("stopRecording", () => {
    // Stop speech recognition
    speechRecognizer.stopContinuousRecognitionAsync(() => {
      console.log("Speech recognition stopped.");
    });

    const { wordCount, answerTimesSeconds } = metrics;

    // Send metrics to client
    emitToSocket(socket, {
      event: "interviewMetrics",
      data: { wordCount, answerTimesSeconds },
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

app.get("/", (req, res) => {
  res.send("Hello from Server");
});
