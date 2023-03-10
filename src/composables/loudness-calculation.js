import { LoudnessMeter } from '@domchristie/needles';

export function calculateMomentaryLoudness(source, loudnessReference) {
  return new Promise((resolve, reject) => {
    var loudnessMeter = new LoudnessMeter({
      source: source,
      modes: ['momentary'],
      workerUri: 'src/composables/needles-worker.js',
      workletUri: 'src/composables/needles-worklet.js',
    });

    loudnessMeter.on('dataavailable', function (event) {
      loudnessReference.value = event.data.value;
    });

    loudnessMeter.start();
  });
}

export function calculateIntegratedLoudness(sound) {
  return new Promise((resolve, reject) => {
    sound.file
      .arrayBuffer()
      .then((arrayBuffer) => {
        const audioCtx = new AudioContext();
        audioCtx.decodeAudioData(arrayBuffer, function (buffer) {
          audioDecoded(buffer, sound, resolve);
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function audioDecoded(buffer, sound, resolve) {
  var offlineAudioContext = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );
  var source = offlineAudioContext.createBufferSource();
  source.buffer = buffer;

  var loudnessMeter = new LoudnessMeter({
    source: source,
    modes: ['integrated'],
    workerUri: 'src/composables/needles-worker.js',
  });

  loudnessMeter.on('dataavailable', function (event) {
    resolve(event.data.value);
  });

  loudnessMeter.start();
}
