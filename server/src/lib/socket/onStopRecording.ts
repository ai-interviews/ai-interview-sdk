import { Socket } from "socket.io";
import { Interviewer } from "../interviewer";
import { Metrics } from "../metrics";
import { emitToSocket } from "./emitToSocket";
import { SpeechRecognizer } from "microsoft-cognitiveservices-speech-sdk";
import { onRuntimeError } from "./onRuntimeError";

export const onStopRecording = async (
  socket: Socket,
  {
    metrics,
    speechRecognizer,
  }: {
    metrics: Metrics;
    speechRecognizer: SpeechRecognizer;
  }
) => {
  try {
    // Stop speech recognition
    speechRecognizer.stopContinuousRecognitionAsync(() => {
      console.log("Speech recognition stopped.");
    });

    const { wordFrequency, lengthSeconds } = metrics.getInterviewMetrics();

    // Send metrics to client
    emitToSocket(socket, {
      event: "interviewMetrics",
      data: { wordFrequency, lengthSeconds },
    });

    socket.disconnect();
  } catch (error) {
    onRuntimeError(socket, { message: "Error stopping recording", error });
  }
};
