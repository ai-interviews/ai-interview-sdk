import { io, Socket } from 'socket.io-client';
import { audioBufferToWav } from './audioBufferToWav';
import initLogger, { Logger } from 'pino';

export class Interview {
  private socket?: Socket;
  private stream?: MediaStream;
  private logger: Logger;
  private streaming: boolean;

  constructor() {
    this.logger = initLogger();
    this.streaming = false;
  }

  private async playAudio(audioData: ArrayBuffer) {
    const audioContext = new AudioContext();
    const buffer = await audioContext.decodeAudioData(audioData);
    const source = audioContext.createBufferSource();

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
      this.socket = io('http://localhost:4200');

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

        const wav = audioBufferToWav(audioBuffer);

        // Stream audio data chunk to server
        this.socket.emit('audioData', wav);
      };

      audioSource.connect(audioWorkletNode);
      audioWorkletNode.connect(audioContext.destination);

      // Handle returning audio data from server
      this.socket.on('audioData', audioBuffer => {
        this.playAudio(audioBuffer);
      });
    } catch (error) {
      this.logger.error('Error streaming audio data:', error);
    }
  }

  public async begin() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.stream = mediaStream;
      this.streamAudioData();
    } catch (error) {
      this.logger.error('Error beginning interview session:', error);
    }
  }

  public stop() {
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
