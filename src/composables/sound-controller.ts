import { SoundModel } from 'src/components/models';
import { dbToGain, getMMSSfromS } from 'src/composables/math-helpers';
import { calculateIntegratedLoudness } from './loudness-calculation';
import { calculateWaveformChunks } from './waveform-display';

export function playStopSound(sound: SoundModel) {
  if (sound.isPlaying) {
    stopSound(sound);
  } else {
    sound.isCuePlayed = true;
    playSound(sound);
    sound.waveformShouldBeRedrawn = true;
  }
}

export function playSound(sound: SoundModel, resumePaused = false) {
  if (sound.inTime !== null && !resumePaused) {
    sound.audioElement.currentTime = sound.inTime ?? 0;
  }

  sound.audioElement.play();
  sound.isPlaying = true;
  sound.launchTime = Date.now();
  clearTimeout(sound.timeOutId);
  sound.waveformShouldBeRedrawn = true;

  if (sound.outTime !== null) {
    const timeOutDuration =
      (sound.outTime - (sound.inTime !== null ? sound.inTime : 0)) * 1000;

    sound.timeOutId = setTimeout(() => {
      sound.audioElement.pause();
    }, timeOutDuration);
  }

  sound.audioElement.addEventListener('ended', () => {
    stopSound(sound);
    sound.isCuePlayed = false;
  });
}

export function stopSound(sound: SoundModel) {
  sound.audioElement.pause();
  sound.audioElement.currentTime = sound.inTime === null ? 0 : sound.inTime;
  sound.isPlaying = false;
  clearTimeout(sound.timeOutId);
  sound.waveformShouldBeRedrawn = true;
}

export function pauseSound(sound: SoundModel) {
  sound.audioElement.pause();
  sound.isPlaying = false;
  clearTimeout(sound.timeOutId);
  sound.waveformShouldBeRedrawn = true;
}

export function setTrimGain(sound: SoundModel, gain: number) {
  sound.trimGain = gain;
  sound.trimGainNode.gain.value = dbToGain(gain);
  sound.waveformShouldBeRedrawn = true;
}

export function setInTime(sound: SoundModel, time: number) {
  sound.inTime = time;
}

export function setInTimeAtCurrentPosition(sound: SoundModel) {
  sound.inTime = sound.audioElement.currentTime;
}

export function deleteInTime(sound: SoundModel) {
  sound.inTime = null;
}

export function setOutTime(sound: SoundModel, time: number) {
  sound.outTime = time;
}

export function setOutTimeAtCurrentPosition(sound: SoundModel) {
  sound.outTime = sound.audioElement.currentTime;
}

export function deleteOutTime(sound: SoundModel) {
  sound.outTime = null;
}

export function setName(sound: SoundModel, name: string) {
  sound.name = name;
}

export function normalizeSound(sound: SoundModel, targetValue: number) {
  if (sound.integratedLoudness === null) {
    calculateIntegratedLoudness(sound).then((loudness) => {
      sound.integratedLoudness = loudness;
      setTrimGain(sound, getTrimValueFromLoudness(loudness, targetValue));
    });
  } else {
    setTrimGain(
      sound,
      getTrimValueFromLoudness(sound.integratedLoudness, targetValue)
    );
  }
}

export function getTrimValueFromLoudness(
  loudness: number,
  targetValue: number
) {
  return Math.round((-23 + targetValue - loudness) * 10) / 10;
}

export function toggleHpf(sound: SoundModel) {
  sound.hpfEnabled = !sound.hpfEnabled;
}

export function setHpfFrequency(sound: SoundModel, frequency: number) {
  sound.hpfFrequency = frequency;
  sound.hpfNode.frequency.value = frequency;
}

export function getSoundDurationLabel(sound: SoundModel) {
  if (sound.isPlaying) {
    return getMMSSfromS(sound.remainingTime !== null ? sound.remainingTime : 0);
  } else return getMMSSfromS(sound.duration);
}

export function getIsCuePlayed(sound: SoundModel) {
  return sound.isCuePlayed;
}

export async function generateWaveformData(
  sound: SoundModel,
  sampleRate: number
) {
  const channelCount = sound.source.channelCount;
  const duration = sound.source.mediaElement.duration;
  const samples = duration * sampleRate;

  try {
    const buffer = await fetch(sound.url).then((response) =>
      response.arrayBuffer()
    );
    const audioBuffer = await new AudioContext().decodeAudioData(buffer);

    const channelData = audioBuffer.getChannelData(0);
    const waveform = await calculateWaveformChunks(channelData);

    sound.waveform = new Float32Array(waveform);
    sound.waveform.set(waveform);
    sound.waveformCalculated = true;

    const memoryUsageInBytes = (sound.waveform.length * 4) / Math.pow(1024, 2);
    console.log(`Memory usage: ${memoryUsageInBytes} MB`);

    sound.waveformShouldBeRedrawn = true;
  } catch (error) {
    console.error('Error:', error);
  }
}
