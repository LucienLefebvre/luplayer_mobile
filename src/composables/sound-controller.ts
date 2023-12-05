import { SoundModel } from 'src/components/models';
import { dbToGain, getMMSSfromS } from 'src/composables/math-helpers';
import { calculateIntegratedLoudness } from './loudness-calculation';
import { calculateWaveformChunks } from './waveform-display';
import { time } from 'console';

export function playStopSound(sound: SoundModel, audioContext: AudioContext) {
  if (sound.isPlaying) {
    stopSound(sound);
  } else {
    sound.isCuePlayed = true;
    playSound(sound, audioContext);
  }
}

export function playSound(
  sound: SoundModel,
  audioContext: AudioContext,
  isCuePlayed = false
) {
  if (!isCuePlayed) {
    sound.audioElement.currentTime = sound.inTime ?? 0;
  }

  if ((sound.enveloppePoints, sound.enveloppePoints.length > 0)) {
    setEnveloppeGainValues(sound, audioContext);
  }

  sound.isCuePlayed = isCuePlayed;
  sound.audioElement.play();
  sound.isPlaying = true;
  sound.launchTime = Date.now();
  clearTimeout(sound.timeOutId);

  if (sound.outTime !== null) {
    const inTime = sound.inTime !== null ? sound.inTime : 0;
    const timeOutDuration = (sound.outTime - inTime) * 1000;

    sound.timeOutId = setTimeout(() => {
      sound.audioElement.pause();
      sound.audioElement.currentTime = inTime;
    }, timeOutDuration);
  }

  sound.audioElement.addEventListener('ended', () => {
    sound.enveloppeGainNode.gain.cancelScheduledValues(0);
    stopSound(sound);
    sound.isCuePlayed = false;
  });
}

export function setEnveloppeGainValues(
  sound: SoundModel,
  audioContext: AudioContext
) {
  const enveloppePoints = sound.enveloppePoints;

  const ctxCurrentTime = audioContext.currentTime;
  const soundCurrentTime = sound.audioElement.currentTime;

  sound.enveloppeGainNode.gain.setValueAtTime(
    dbToGain(getEnveloppeValueAtTime(sound, soundCurrentTime)),
    ctxCurrentTime
  );

  enveloppePoints.forEach((point, index) => {
    const gain = dbToGain(point.gainDb);
    const nextPoint = enveloppePoints[index + 1];

    if (nextPoint) {
      sound.enveloppeGainNode.gain.exponentialRampToValueAtTime(
        dbToGain(nextPoint.gainDb),
        nextPoint.time + ctxCurrentTime - soundCurrentTime
      );
    } else {
      sound.enveloppeGainNode.gain.setValueAtTime(gain, point.time);
    }
  });
}

export function stopSound(sound: SoundModel) {
  sound.audioElement.pause();
  sound.audioElement.currentTime = sound.inTime ?? 0;
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

export async function normalizeSound(sound: SoundModel, targetValue: number) {
  const startTime = performance.now();
  if (sound.integratedLoudness === null) {
    calculateIntegratedLoudness(sound).then((loudness) => {
      sound.integratedLoudness = loudness;
      setTrimGain(sound, getTrimValueFromLoudness(loudness, targetValue));
      const endTime = performance.now();
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
  //sound.hpfNode.frequency.value = frequency;
}

export function getSoundDurationLabel(sound: SoundModel) {
  if (sound.isPlaying) {
    return getMMSSfromS(sound.remainingTime !== null ? sound.remainingTime : 0);
  } else return getMMSSfromS(sound.duration);
}

export function getIsCuePlayed(sound: SoundModel) {
  return sound.isCuePlayed;
}

export function getEnveloppeValueAtTime(sound: SoundModel, time: number) {
  const enveloppePoints = sound.enveloppePoints;

  if (enveloppePoints.length === 0) return 0;
  if (time <= enveloppePoints[0].time) return enveloppePoints[0].gainDb;
  if (time >= enveloppePoints[enveloppePoints.length - 1].time)
    return enveloppePoints[enveloppePoints.length - 1].gainDb;

  for (let i = 0; i < enveloppePoints.length - 1; i++) {
    const point1 = enveloppePoints[i];
    const point2 = enveloppePoints[i + 1];
    if (time >= point1.time && time <= point2.time) {
      const timeDelta = point2.time - point1.time;
      const gainDbDelta = point2.gainDb - point1.gainDb;
      const timeRatio = (time - point1.time) / timeDelta;
      const gainDb = point1.gainDb + timeRatio * gainDbDelta;
      return gainDb;
    }
  }
  return 0;
}
