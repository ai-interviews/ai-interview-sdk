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
import { InterviewerVoice } from "./interviewer";

const speechConfig = SpeechConfig.fromSubscription(
  process.env.AZURE_COGNITIVE_SERVICES_SPEECH_KEY!,
  "eastus"
);

/**
 *
 * @param onSpeechRecognized Callback is called when a completed phrase has been recognized.
 * @param onSpeechRecognizing Callback is called as words are being recognized.
 * @returns Object with:
 * - pushStream to write binary audio chunks to
 * - speechRecognizer to begin and end speech recognition
 */
export const initializeSpeechToText = ({
  onSpeechRecognized,
  onSpeechRecognizing,
}: {
  onSpeechRecognized: (text: string) => void;
  onSpeechRecognizing?: (text: string) => void;
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

  speechRecognizer.recognizing = (s, e) => {
    if (
      e.result.reason === ResultReason.RecognizingSpeech &&
      e.result.text.length > 1
    ) {
      onSpeechRecognizing?.(e.result.text);
    }
  };

  speechRecognizer.canceled = (s, e) => {
    console.log(`CANCELED: Reason=${e.errorDetails}`);

    if (e.reason === CancellationReason.Error) {
      console.log(`CANCELED: ErrorDetails=${e.errorDetails}`);
    }

    speechRecognizer.stopContinuousRecognitionAsync();
  };

  return { pushStream, speechRecognizer };
};

/**
 *
 * @param text Text to convert into speech
 * @returns Binary audio data
 */
export const textToSpeech = async ({
  text,
  voice = "en-CA-LiamNeural",
}: {
  text: string;
  voice?: InterviewerVoice;
}): Promise<ArrayBuffer> => {
  const synthesizer = new SpeechSynthesizer(speechConfig);

  return new Promise((resolve, reject) => {
    synthesizer.speakSsmlAsync(
      generateSsml({ voice, text }),
      (result) => {
        synthesizer.close();

        resolve(result.audioData);
      },
      (error) => {
        console.log(error);
        synthesizer.close();

        reject(error);
      }
    );
  });
};

const generateSsml = ({ voice, text }: { voice: string; text: string }) => `
  <speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
    <voice name="${voice}">
      <mstts:express-as style="cheerful" styledegree="1">
        <prosody rate="+8.00%">
          ${text}
        </prosody>
      </mstts:express-as>
    </voice>
  </speak>
`;
