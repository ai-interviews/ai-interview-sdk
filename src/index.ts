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
  JobOptions,
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
  private jobOptions?: JobOptions;
  private audioSource?: AudioBufferSourceNode;

  constructor(
    {
      onResponseAudio,
      onSpeechRecognized,
      onResponseMetrics,
      onInterviewMetrics,
      onRecognitionStarted,
    }: ConstructorCallbacks = {},
    {
      automaticAudioPlayback = true,
      interviewerOptions,
      jobOptions,
      candidateName,
      candidateResume,
    }: ConstructorOptions = {},
  ) {
    this.logger = initLogger();
    this.streaming = false;
    this.interviewerOptions = interviewerOptions;
    this.candidateName = candidateName;
    this.candidateResume = candidateResume;
    this.jobOptions = jobOptions;

    this.handleSocketEvents = socket => {
      // Handle speech recognition started
      socket.on('recognitionStarted', () => {
        if (this.streaming) {
          onRecognitionStarted?.();
        }
      });

      // Handle metrics at the end of each candidate response
      socket.on('responseMetrics', (data: ResponseMetricsEventData) => {
        if (this.streaming) {
          onResponseMetrics?.(data);
        }
      });

      // Handle metrics at the end of the interview
      socket.on('interviewMetrics', (data: InterviewMetricsEventData) => {
        if (this.streaming) {
          onInterviewMetrics?.(data);
        }
      });

      // Handle candidate speech recognized by server
      socket.on('speechRecognized', (data: SpeechRecognizedEventData) => {
        if (this.streaming) {
          onSpeechRecognized?.(data);
        }
      });

      // Handle returning audio data from server
      socket.on('audio', (data: AudioEventData) => {
        if (this.streaming) {
          onResponseAudio(data);

          if (automaticAudioPlayback) {
            this.playAudio(data.buffer);
          }
        }
      });
    };
  }

  private async playAudio(audioData: ArrayBuffer) {
    const audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(audioData);
    this.audioSource = audioContext.createBufferSource();

    setTimeout(() => {
      this.socket.emit('questionAsked');
    }, buffer.duration * 1000);

    this.audioSource.buffer = buffer;
    this.audioSource.connect(audioContext.destination);
    this.audioSource.start();
  }

  private async beginStreamingAudioData() {
    try {
      if (this.streaming) {
        throw Error('Session is already in progress.');
      }

      if (!this.stream) {
        throw Error('No stream instance found. Check the console for errors.');
      }

      this.streaming = true;
      this.socket = io('https://ai-interviews.azurewebsites.net/', {
        query: {
          ...(this.interviewerOptions.name && { interviewerName: this.interviewerOptions.name }),
          ...(this.interviewerOptions.age && { interviewerAge: this.interviewerOptions.age }),
          ...(this.interviewerOptions.voice && { interviewerVoice: this.interviewerOptions.voice }),
          ...(this.interviewerOptions.bio && { interviewerBio: this.interviewerOptions.bio }),
          ...(this.candidateName && { candidateName: this.candidateName }),
          ...(this.candidateResume && { candidateResume: this.candidateResume }),
          ...(this.jobOptions?.title && { jobTitle: this.jobOptions.title }),
          ...(this.jobOptions?.description && { jobDescription: this.jobOptions.description }),
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

      await this.beginStreamingAudioData();

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

      // Stop playing audio
      if (this.audioSource) {
        this.audioSource.stop();
      }

      // Stop recording audio
      this.stream.getTracks().forEach(track => {
        track.stop();
      });

      // Tell the backend to stop listening for audio
      this.socket.emit('stopRecording');
    } catch (error) {
      this.logger.error('Error stopping interview session:', error);
    }
  }
}
