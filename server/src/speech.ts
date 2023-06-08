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
  onSpeechRecognizing,
}: {
  onSpeechRecognized: (text: string) => void;
  onSpeechRecognizing?: () => void;
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

  speechRecognizer.recognizing = (s, e) => onSpeechRecognizing?.();

  speechRecognizer.canceled = (s, e) => {
    console.log(`CANCELED: Reason=${e.errorDetails}`);

    if (e.reason === CancellationReason.Error) {
      console.log(`CANCELED: ErrorDetails=${e.errorDetails}`);
    }

    speechRecognizer.stopContinuousRecognitionAsync();
  };

  return { pushStream, speechRecognizer };
};

const generateSsml = (text: string) => `
  <speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
    <voice name="en-US-DavisNeural">
      <mstts:express-as style="cheerful" styledegree="1">
        <prosody rate="+10.00%">
          ${text}
        </prosody>
      </mstts:express-as>
    </voice>
  </speak>
`;

export const textToSpeech = ({
  text,
  onAudioRecieved,
}: {
  text: string;
  onAudioRecieved: (audioData: ArrayBuffer) => void;
}) => {
  const synthesizer = new SpeechSynthesizer(speechConfig);

  synthesizer.speakSsmlAsync(
    generateSsml(text),
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
