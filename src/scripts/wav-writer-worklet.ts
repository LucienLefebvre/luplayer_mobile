class WavWriterWorklet extends AudioWorkletProcessor {
  sampleRate = 48000;
  chunkSize = 4096;
  chunk = new Float32Array(this.chunkSize);
  constructor() {
    super();
  }

  index = 0;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: { [name: string]: Float32Array }
  ) {
    inputs.forEach((input) => {
      const channel = input[0];
      this.port.postMessage('index' + this.index);
      this.port.postMessage('divider' + this.chunkSize / channel.length);
      this.chunk.set(channel, this.chunkSize * this.index);
      this.index++;
      if (this.index === this.chunkSize / channel.length) {
        this.port.postMessage('chunk : ' + this.chunk);
        this.index = 0;
      }
    });
    this.port.postMessage('chunk : ' + this.chunk);
    return true;
  }

  /*
  public async writeAudioBufferToFile(audioBuffer: AudioBuffer) {
    const buffer = audioBuffer.getChannelData(0);
    const blob = this.bufferToWav(buffer);
    await this.appendBlobToFile(blob);
  }

  async appendBlobToFile(blob: Blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const base64String = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );
    await Filesystem.appendFile({
      path: this.path,
      directory: this.directory,
      data: base64String,
    });
  }

  public bufferToWav(buffer: Float32Array): Blob {
    const interleaved = this.interleave(buffer);
    const dataview = this.encodeWAV(interleaved);
    return new Blob([dataview], { type: 'audio/wav' });
  }

  private interleave(leftChannel: Float32Array): Float32Array {
    const length = leftChannel.length;
    const result = new Float32Array(length * 2);
    for (let i = 0; i < length; i++) {
      result[2 * i] = leftChannel[i];
      result[2 * i + 1] = leftChannel[i];
    }
    return result;
  }

  private encodeWAV(samples: Float32Array): DataView {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + samples.length * 2, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 2, true); // stereo
    // sample rate
    view.setUint32(24, this.sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, this.sampleRate * 2 * 2, true); // stereo
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2 * 2, true); // stereo
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    this.writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, samples.length * 2, true);

    this.floatTo16BitPCM(view, 44, samples);

    return view;
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  private floatTo16BitPCM(
    output: DataView,
    offset: number,
    input: Float32Array
  ) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  } */
}

registerProcessor('wav-writer-worklet', WavWriterWorklet);
