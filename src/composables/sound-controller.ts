import { SoundModel } from 'src/components/models';
import {
  dbToGain,
  getTrimValueFromLoudness,
} from 'src/composables/math-helpers';
import { calculateIntegratedLoudness } from './loudness-calculation';

export function playStopSound(sound: SoundModel) {
  if (sound.isPlaying) {
    stopSound(sound);
  } else {
    playSound(sound);
  }
}

export function playSound(sound: SoundModel) {
  if (sound.inTime !== null) {
    sound.audioElement.currentTime = sound.inTime ?? 0;
  }

  sound.audioElement.play();
  sound.isPlaying = true;
  clearTimeout(sound.timeOutId);

  if (sound.outTime !== null) {
    const timeOutDuration =
      (sound.outTime - (sound.inTime !== null ? sound.inTime : 0)) * 1000;

    sound.timeOutId = setTimeout(() => {
      sound.audioElement.pause();
    }, timeOutDuration);
  }

  sound.audioElement.addEventListener('ended', () => {
    stopSound(sound);
  });
}

export function stopSound(sound: SoundModel) {
  sound.audioElement.pause();
  sound.audioElement.currentTime = sound.inTime === null ? 0 : sound.inTime;
  sound.isPlaying = false;
  clearTimeout(sound.timeOutId);
}

export function pauseSound(sound: SoundModel) {
  sound.audioElement.pause();
  sound.isPlaying = false;
  clearTimeout(sound.timeOutId);
}

export function setTrimGain(sound: SoundModel, gain: number) {
  sound.trimGain = gain;
  sound.trimGainNode.gain.value = dbToGain(gain);
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

export function normalizeSound(sound: SoundModel) {
  if (sound.integratedLoudness === null) {
    calculateIntegratedLoudness(sound).then((loudness) => {
      sound.integratedLoudness = loudness;
      setTrimGain(sound, getTrimValueFromLoudness(loudness));
    });
  } else {
    setTrimGain(sound, getTrimValueFromLoudness(sound.integratedLoudness));
  }
}

export function toggleHpf(sound: SoundModel) {
  sound.hpfEnabled = !sound.hpfEnabled;
}

export function setHpfFrequency(sound: SoundModel, frequency: number) {
  sound.hpfFrequency = frequency;
  sound.hpfNode.frequency.value = frequency;
}
