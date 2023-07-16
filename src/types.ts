export type InterviewMetricsEventData = {
  wordCount: Record<string, number>;
  lengthSeconds: number;
};

export type ResponseMetricsEventData = {
  question: string;
  response: string;
  wordFrequency: Record<string, number>;
  answerTimeSeconds: number;
  quietTimeSeconds: number;
  quantifiedMetric: number;
};

export type AudioEventData = {
  text: string;
  buffer: ArrayBuffer;
};

export type SpeechRecognizedEventData = {
  text: string;
  isCompletePhrase: boolean;
};

export type InterviewEndEventData = {
  feedback: string;
};

export type InterviewerVoice = 'en-CA-ClaraNeural' | 'en-CA-LiamNeural';

export type InterviewerOptions = {
  name?: string;
  age?: number;
  bio?: string;
  voice?: InterviewerVoice;
};

export type JobOptions = {
  title: string;
  description: string;
};

export type ConstructorCallbacks = {
  onRecognitionStarted?: () => void;
  onResponseAudio?: (data: AudioEventData) => void;
  onSpeechRecognized?: (data: SpeechRecognizedEventData) => void;
  onResponseMetrics?: (metrics: ResponseMetricsEventData) => void;
  onInterviewMetrics?: (metrics: InterviewMetricsEventData) => void;
  onInterviewEnd?: (metrics: InterviewEndEventData) => void;
  onInterviewerFinishedSpeaking?: () => void;
};

export type ConstructorOptions = {
  automaticAudioPlayback?: boolean;
  interviewerOptions?: InterviewerOptions;
  jobOptions?: JobOptions;
  candidateName?: string;
  candidateResume?: string;
  textOnly?: boolean;
};
