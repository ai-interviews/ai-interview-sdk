import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

let socket;
let scriptProcessor;
let stream;

const handleAudioProcess = (event) => {
  const wav = audioBufferToWav(event.inputBuffer);

  // Send the audio data to the backend via the WebSocket connection
  socket.emit("audioData", wav);
};

const play = async (data) => {
  const context = new AudioContext();
  const buffer = await context.decodeAudioData(data);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
};

// Function to handle streaming audio data to the backend
function streamAudioData() {
  socket = io("http://localhost:4200");

  const audioContext = new AudioContext();
  const audioSource = audioContext.createMediaStreamSource(stream);

  scriptProcessor = audioContext.createScriptProcessor(undefined, 1, 1);

  audioSource.connect(scriptProcessor);

  scriptProcessor.addEventListener("audioprocess", handleAudioProcess);

  scriptProcessor.connect(audioContext.destination);

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

      // Start streaming audio data
      streamAudioData();
    })
    .catch((error) => {
      console.error("Error accessing microphone:", error);
    });
});

// Stop recording when the "Stop Recording" button is clicked
document.getElementById("stop").addEventListener("click", () => {
  if (socket) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });

    scriptProcessor.removeEventListener("audioprocess", handleAudioProcess);
    scriptProcessor.disconnect();

    // Emit a stop recording event to the backend
    socket.emit("stopRecording");
  }
});
