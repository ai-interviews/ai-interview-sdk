import { io, Socket } from 'socket.io-client';
import { audioBufferToWav } from './audioBufferToWav';
import initLogger, { Logger } from 'pino';
import {
  InterviewerOptions,
  ConstructorCallbacks,
  ConstructorOptions,
  ResponseMetricsEventData,
  InterviewMetricsEventData,
  SpeechRecognizedEventData,
  AudioEventData,
} from './types';

export class Interview {
  private socket?: Socket;
  private stream?: MediaStream;
  private logger: Logger;
  private streaming: boolean;
  private handleSocketEvents: (socket: Socket) => void;
  private interviewerOptions?: InterviewerOptions;
  private candidateName?: string;
  private candidateResume?: string;

  constructor(
    {
      onResponseAudio,
      onSpeechRecognized,
      onResponseMetrics,
      onInterviewMetrics,
      onRecognitionStarted,
    }: ConstructorCallbacks = {},
    { automaticAudioPlayback = true, interviewerOptions, candidateName, candidateResume }: ConstructorOptions = {},
  ) {
    this.logger = initLogger();
    this.streaming = false;
    this.interviewerOptions = interviewerOptions;
    this.candidateName = candidateName;
    this.candidateResume = candidateResume;

    this.handleSocketEvents = socket => {
      // Handle speech recognition started
      socket.on('recognitionStarted', () => {
        onRecognitionStarted?.();
      });

      // Handle metrics at the end of each candidate response
      socket.on('responseMetrics', (data: ResponseMetricsEventData) => {
        onResponseMetrics?.(data);
      });

      // Handle metrics at the end of the interview
      socket.on('interviewMetrics', (data: InterviewMetricsEventData) => {
        onInterviewMetrics?.(data);
      });

      // Handle candidate speech recognized by server
      socket.on('speechRecognized', (data: SpeechRecognizedEventData) => {
        onSpeechRecognized?.(data);
      });

      // Handle returning audio data from server
      socket.on('audio', (data: AudioEventData) => {
        onResponseAudio(data);

        if (automaticAudioPlayback) {
          this.playAudio(data.buffer);
        }
      });
    };
  }

  private async playAudio(audioData: ArrayBuffer) {
    const audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(audioData);
    const source = audioContext.createBufferSource();

    setTimeout(() => {
      this.socket.emit('questionAsked');
    }, buffer.duration * 1000);

    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  }

  private async streamAudioData() {
    try {
      if (this.streaming) {
        throw Error('Session is already in progress.');
      }

      if (!this.stream) {
        throw Error('No stream instance found. Check the console for errors.');
      }

      this.streaming = true;
      this.socket = io('http://localhost:4200', {
        query: {
          interviewerName: this.interviewerOptions.name,
          interviewerAge: this.interviewerOptions.age,
          interviewerVoice: this.interviewerOptions.voice,
          interviewerBio: this.interviewerOptions.bio,
          candidateName: this.candidateName,
          candidateResume: this.candidateResume,
        },
      });

      // Add audio worklet module
      const audioContext = new AudioContext();
      const audioWorkletUrl = new URL('./audio-worklet-processor.js', import.meta.url);
      await audioContext.audioWorklet.addModule(audioWorkletUrl);
      const audioSource = audioContext.createMediaStreamSource(this.stream);
      const audioWorkletNode = new AudioWorkletNode(audioContext, 'audio-worklet-processor');

      // Listen to the messages from AudioWorkletProcessor
      audioWorkletNode.port.onmessage = event => {
        const audioBuffer = audioContext.createBuffer(2, event.data[0].length, audioContext.sampleRate);

        audioBuffer.copyToChannel(event.data[0], 0);
        audioBuffer.copyToChannel(event.data[1], 1);

        const wavBuffer = audioBufferToWav(audioBuffer);

        // Stream audio data chunk to server
        this.socket.emit('audioData', wavBuffer);
      };

      audioSource.connect(audioWorkletNode);
      audioWorkletNode.connect(audioContext.destination);

      this.streaming = true;
    } catch (error) {
      this.logger.error('Error streaming audio data:', error);
    }
  }

  public isActive() {
    return this.streaming;
  }

  public finishedSpeaking() {
    try {
      this.socket.emit('finishedSpeaking');
    } catch (error) {
      this.logger.error('Error emitting finished speaking signal:', error);
    }
  }

  public async begin() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      await this.streamAudioData();

      if (!this.socket) {
        throw Error('Socket connection not established.');
      }

      this.handleSocketEvents(this.socket);
    } catch (error) {
      this.logger.error('Error beginning interview session:', error);
    }
  }

  public end() {
    try {
      if (!this.streaming || !this.stream || !this.socket) {
        throw Error('No session is in progress.');
      }

      this.streaming = false;

      this.stream.getTracks().forEach(track => {
        track.stop();
      });

      // Tell the backend to stop listening
      this.socket.emit('stopRecording');
    } catch (error) {
      this.logger.error('Error stopping interview session:', error);
    }
  }
}
