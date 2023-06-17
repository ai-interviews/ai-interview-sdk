import { Socket } from "socket.io";

type Audio = {
  event: "audio";
  data: {
    text: string;
    buffer: ArrayBuffer;
  };
};

type SpeechRecognized = {
  event: "speechRecognized";
  data: {
    text: string;
  };
};

type ResponseMetrics = {
  event: "responseMetrics";
  data: {
    wordCount: Record<string, number>;
    answerTimeSeconds: number;
  };
};

type InterviewMetrics = {
  event: "interviewMetrics";
  data: {
    wordCount: Record<string, number>;
    answerTimesSeconds: number[];
  };
};

type SocketData = Audio | ResponseMetrics | InterviewMetrics | SpeechRecognized;

export const emitToSocket = (socket: Socket, { event, data }: SocketData) => {
  try {
    socket.emit(event, data);
  } catch (e) {
    console.error("Failed to emit", event, "data to socket:", e);
  }
};
