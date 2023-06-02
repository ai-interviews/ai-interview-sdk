class AudioWorkletProcessorHandler extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, _) {
    this.port.postMessage(inputs[0]);

    return true;
  }
}

registerProcessor('audio-worklet-processor', AudioWorkletProcessorHandler);
