import { calculate_waveform_chunks } from 'src/rust/waveform_process/pkg';

onmessage = async function (
  event: MessageEvent<{ src: string; duration: number }>
) {
  try {
    const buffer = await fetch(event.data.src).then((response) =>
      response.arrayBuffer()
    );
    const audioBuffer = await new OfflineAudioContext({
      numberOfChannels: 2,
      length: buffer.byteLength,
      sampleRate: 48000,
    }).decodeAudioData(buffer);
    const leftChannelData = audioBuffer.getChannelData(0);
    let rightChannelData;
    if (audioBuffer.numberOfChannels > 1) {
      rightChannelData = audioBuffer.getChannelData(1);
    } else {
      rightChannelData = leftChannelData;
    }

    let WINDOW_SIZE = 128; // Set your default WINDOW_SIZE here

    if (event.data.duration < 2) {
      WINDOW_SIZE = 8;
    }

    const waveformChunks = calculate_waveform_chunks(
      leftChannelData,
      rightChannelData,
      WINDOW_SIZE
    );

    postMessage({ waveformChunks, duration: event.data.duration });
  } catch (error) {
    postMessage({ error: (error as Error).message });
  }
};
