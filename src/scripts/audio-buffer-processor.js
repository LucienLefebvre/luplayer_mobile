class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (event) => {
      if (event.data === 'start') {
        this.active = true;
        this.audioData = [];
      } else if (event.data === 'stop') {
        this.active = false;
        this.port.postMessage(this.audioData);
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    // Access the raw audio buffer
    const rawAudioBuffer = input[0];

    // Your custom processing code here

    // Pass the processed data to the output
    output.forEach((channel, channelIndex) => {
      channel.set(rawAudioBuffer);
    });

    // Post the raw audio buffer to the main thread
    self.postMessage({ rawAudioBuffer }, [rawAudioBuffer.buffer]);
    return true;
  }
}

registerProcessor('audio-buffer-processor', AudioProcessor);
