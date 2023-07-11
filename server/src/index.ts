import "dotenv/config";
import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import { initializeSpeechToText, textToSpeech } from "./lib/speech";
import {
  Interviewer,
  InterviewerOptions,
  interviewerVoices,
} from "./lib/interviewer";
import { Metrics } from "./lib/metrics";
import { emitToSocket } from "./lib/socket/emitToSocket";
import { onFinishedSpeaking } from "./lib/socket/onFinishedSpeaking";
import { onStopRecording } from "./lib/socket/onStopRecording";
import { onRuntimeError } from "./lib/socket/onRuntimeError";
import { z } from "zod";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

type InitialData = {
  interviewerName?: string;
  interviewerAge?: string;
  interviewerVoice?: string;
  interviewerBio?: string;
  candidateName?: string;
  candidateResume?: string;
};

const connectionSchema = z.object({
  interviewerName: z.string().optional(),
  interviewerAge: z.string().optional(),
  interviewerVoice: z.enum(interviewerVoices).optional(),
  interviewerBio: z.string().optional(),
  candidateName: z.string().optional(),
  candidateResume: z.string().optional(),
});

io.on("connection", async (socket) => {
  console.log("A client connected.");

  // Initial data and interview tracking
  const {
    interviewerName,
    interviewerAge,
    interviewerVoice,
    interviewerBio,
    candidateName,
    candidateResume,
  } = connectionSchema.parse(socket.handshake.query);

  const metrics = new Metrics();
  const interviewer = new Interviewer({
    numRequiredQuestions: 3,
    candidateName,
    interviewerOptions: {
      name: interviewerName,
      age: Number(interviewerAge),
      voice: interviewerVoice,
      bio: interviewerBio,
    },
  });

  await interviewer.init();

  // Ask opener question to candidate
  const openerQuestion = await interviewer.getNextQuestion("");
  const openerAudioData = await textToSpeech({
    text: openerQuestion,
    voice: interviewerVoice,
  });

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
    // Called when end of phrase recognized, punctuation added.
    onSpeechRecognized: (candidateResponseFragment) => {
      try {
        metrics.startQuietTimeTimer();
        candidateResponse += " " + candidateResponseFragment;

        emitToSocket(socket, {
          event: "speechRecognized",
          data: {
            text: candidateResponse,
            isCompletePhrase: true,
          },
        });
      } catch (error) {
        onRuntimeError(socket, {
          message: "Error recognizing candidate speech",
          error,
        });
      }
    },
    // Called on every word recognized
    onSpeechRecognizing: (text: string) => {
      try {
        metrics.startAnswerTimer();
        metrics.endQuietTimeTimer();

        emitToSocket(socket, {
          event: "speechRecognized",
          data: {
            text: candidateResponse + text,
            isCompletePhrase: false,
          },
        });
      } catch (error) {
        onRuntimeError(socket, {
          message: "Error recognizing candidate speech",
          error,
        });
      }
    },
  });

  // Start speech recognition
  speechRecognizer.startContinuousRecognitionAsync(
    () => emitToSocket(socket, { event: "recognitionStarted", data: {} }),
    (errorMessage) => {
      const message = `Error starting speech recognition: ${errorMessage}`;
      console.error(message);
      emitToSocket(socket, { event: "error", data: { message } });
    }
  );

  // Process stream of audio data from client
  socket.on("audioData", (data: ArrayBuffer) => {
    pushStream.write(data);
  });

  // Process candidate response and generate next response
  socket.on("finishedSpeaking", async () => {
    if (!candidateResponse.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!candidateResponse.length) {
      console.log("No speech detected.");
      return;
    }

    await onFinishedSpeaking(socket, {
      candidateResponse,
      interviewer,
      metrics,
    });

    // Reset candidate response
    candidateResponse = "";
  });

  // When the interviewer is finished asking a question
  socket.on("questionAsked", () => metrics.startQuietTimeTimer());

  // Stop continuous speech recognition, and disconnect socket
  socket.on("stopRecording", () =>
    onStopRecording(socket, { metrics, speechRecognizer })
  );

  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Hello from Server");
});
