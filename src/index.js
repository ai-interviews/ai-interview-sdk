import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";
import { audioBufferToWav } from "./factory.js";

let socket;
let stream;

const play = async (data) => {
  const context = new AudioContext();
  const buffer = await context.decodeAudioData(data);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
};

// Handle streaming audio data to the backend
async function streamAudioData() {
  socket = io("http://localhost:4200");

  const audioContext = new AudioContext();
  await audioContext.audioWorklet.addModule("audio-worklet-processor.js");
  const audioSource = audioContext.createMediaStreamSource(stream);
  const audioWorkletNode = new AudioWorkletNode(
    audioContext,
    "audio-worklet-processor"
  );

  // Listen to the messages from your AudioWorkletProcessor
  audioWorkletNode.port.onmessage = (event) => {
    // Create a new AudioBuffer and fill it with the data received from the AudioWorkletProcessor
    const audioBuffer = audioContext.createBuffer(
      2,
      event.data[0].length,
      audioContext.sampleRate
    );

    // Fill the AudioBuffer with the Float32Array data received from the AudioWorkletProcessor
    audioBuffer.copyToChannel(event.data[0], 0);
    audioBuffer.copyToChannel(event.data[1], 1);

    const wav = audioBufferToWav(audioBuffer);

    // Stream the audio data to server
    socket.emit("audioData", wav);
  };

  audioSource.connect(audioWorkletNode);
  audioWorkletNode.connect(audioContext.destination);

  // Handle returning audio data
  socket.on("audioData", (buffer) => {
    console.log(buffer);

    play(buffer);
  });
}

// Start recording when the "Start Recording" button is clicked
document.getElementById("start").addEventListener("click", () => {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((mediaStream) => {
      stream = mediaStream;

      streamAudioData();
    })
    .catch((error) => {
      console.error("Error accessing microphone:", error);
    });
});

// Stop recording when the "Stop Recording" button is clicked
document.getElementById("stop").addEventListener("click", () => {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });

  // Tell the backend to stop listening
  socket?.emit("stopRecording");
});
