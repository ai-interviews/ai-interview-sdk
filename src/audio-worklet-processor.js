class AudioWorkletProcessorHandler extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs) {
    // Here you can directly send the data to your main thread
    this.port.postMessage(inputs[0]);

    return true; // To keep the processor alive
  }
}

registerProcessor("audio-worklet-processor", AudioWorkletProcessorHandler);
