import { Socket } from "socket.io";

type AudioEvent = {
  event: "audio";
  data: {
    text: string;
    buffer: ArrayBuffer;
  };
};

type SpeechRecognizedEvent = {
  event: "speechRecognized";
  data: {
    text: string;
    isCompletePhrase: boolean;
  };
};

type ResponseMetricsEvent = {
  event: "responseMetrics";
  data: {
    question: string;
    response: string;
    wordFrequency: Record<string, number>;
    answerTimeSeconds: number;
    quietTimeSeconds: number;
  };
};

type InterviewMetricsEvent = {
  event: "interviewMetrics";
  data: {
    wordFrequency: Record<string, number>;
    lengthSeconds: number;
  };
};

type RecognitionStartedEvent = {
  event: "recognitionStarted";
  data: {};
};

type RuntimeErrorEvent = {
  event: "error";
  data: {
    message: string;
  };
};

type SocketData =
  | AudioEvent
  | ResponseMetricsEvent
  | InterviewMetricsEvent
  | SpeechRecognizedEvent
  | RecognitionStartedEvent
  | RuntimeErrorEvent;

export const emitToSocket = (socket: Socket, { event, data }: SocketData) => {
  try {
    socket.emit(event, data);
  } catch (e) {
    console.error("Failed to emit", event, "data to socket:", e);
  }
};
