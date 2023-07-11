export function audioBufferToWav(buffer: AudioBuffer, float32 = false) {
  const numChannels = buffer.numberOfChannels;
  const format = float32 ? 3 : 1;
  const bitDepth = format === 3 ? 32 : 16;

  let result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  return encodeWAV(result, format, bitDepth);
}

function encodeWAV(samples: Float32Array, format: number, bitDepth: number) {
  const bytesPerSample = bitDepth / 8;

  const buffer = new ArrayBuffer(samples.length * bytesPerSample);
  const view = new DataView(buffer);

  if (format === 1) {
    // Raw PCM
    floatTo16BitPCM(view, 0, samples);
  } else {
    writeFloat32(view, 0, samples);
  }

  return Buffer.from(buffer);
}

function interleave(inputL: Float32Array, inputR: Float32Array) {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);

  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function writeFloat32(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i], true);
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}
