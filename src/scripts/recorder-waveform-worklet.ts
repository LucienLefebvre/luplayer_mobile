class RecorderWaveformWorklet extends AudioWorkletProcessor {
  timeDivider = 10;
  index = 0;

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: { [name: string]: Float32Array }
  ) {
    if (this.index === this.timeDivider) {
      this.port.postMessage(this.getMaxValue(inputs[0][0]));
    } else this.index++;
    return true;
  }

  getMaxValue(input: Float32Array) {
    let max = 0;
    for (let i = 0; i < input.length; i++) {
      const absValue = Math.abs(input[i]);
      if (absValue > max) {
        max = absValue;
      }
    }
    this.index = 0;
    return max;
  }
}

registerProcessor('recorder-waveform-worklet', RecorderWaveformWorklet);
