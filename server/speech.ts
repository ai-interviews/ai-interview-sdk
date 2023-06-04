import { ConversationChain } from "langchain/dist/chains/conversation";
import {
  SpeechConfig,
  AudioInputStream,
  AudioConfig,
  SpeechRecognizer,
  ResultReason,
  CancellationReason,
  AudioStreamFormat,
  SpeechSynthesizer,
} from "microsoft-cognitiveservices-speech-sdk";

const speechConfig = SpeechConfig.fromSubscription(
  process.env.AZURE_COGNITIVE_SERVICES_SPEECH_KEY!,
  "eastus"
);

export const initializeSpeechToText = ({
  onSpeechRecognized,
}: {
  onSpeechRecognized: (text: string) => void;
}) => {
  const pushStream = AudioInputStream.createPushStream(
    AudioStreamFormat.getWaveFormatPCM(48000, 16, 2)
  );

  const audioConfig = AudioConfig.fromStreamInput(pushStream);
  const speechRecognizer = new SpeechRecognizer(speechConfig, audioConfig);

  speechRecognizer.recognized = (s, e) => {
    if (
      e.result.reason === ResultReason.RecognizedSpeech &&
      e.result.text.length > 1
    ) {
      onSpeechRecognized(e.result.text);
    }
  };

  speechRecognizer.canceled = (s, e) => {
    console.log(`CANCELED: Reason=${e.errorDetails}`);

    if (e.reason === CancellationReason.Error) {
      console.log(`CANCELED: ErrorDetails=${e.errorDetails}`);
    }

    speechRecognizer.stopContinuousRecognitionAsync();
  };

  speechRecognizer.speechEndDetected = (s, e) => {
    console.log("Speech has stopped being detected");
  };

  return { pushStream, speechRecognizer };
};

export const initializeTextToSpeech = ({
  text,
  onAudioRecieved,
}: {
  text: string;
  onAudioRecieved: (audioData: ArrayBuffer) => void;
}) => {
  // Configure resulting voice
  speechConfig.speechSynthesisLanguage = "en-US";
  speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";
  // speechConfig.outputFormat = SpeechSynthesisOutputFormat.aud

  const synthesizer = new SpeechSynthesizer(speechConfig);

  synthesizer.speakTextAsync(
    text,
    (result) => {
      synthesizer.close();

      onAudioRecieved(result.audioData);
    },
    (error) => {
      console.log(error);
      synthesizer.close();
    }
  );
};
