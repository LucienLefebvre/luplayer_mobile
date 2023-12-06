import { SoundModel } from 'src/components/models';
import { dbToGain, getMMSSfromS } from 'src/composables/math-helpers';
import { calculateIntegratedLoudness } from './loudness-calculation';
import { useSoundsStore } from 'src/stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';

export function playSound(sound: SoundModel, isCuePlayed = false) {
  console.log('playSound');
  const soundsStore = useSoundsStore();
  const audioContext = soundsStore.audioContext;
  if (audioContext === null) return;

  initSoundAudio(sound, audioContext, soundsStore);

  sound.trimGainNode!.gain.value = dbToGain(sound.trimGain);

  if (!isCuePlayed) {
    sound.audioElement.currentTime = sound.inTime ?? 0;
  }
  if (soundsStore.selectedSound === sound) {
    sound.volumeGainNode!.gain.value = dbToGain(
      soundsStore.selectedSoundVolume
    );
  }
  if ((sound.enveloppePoints, sound.enveloppePoints.length > 0)) {
    setEnveloppeGainValues(sound, useSoundsStore().audioContext!);
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
      pauseSound(sound);
      sound.audioElement.currentTime = 0;
    }, timeOutDuration);
  }

  sound.audioElement.addEventListener('ended', () => {
    sound.enveloppeGainNode!.gain.cancelScheduledValues(0);
    stopSound(sound);
    sound.isCuePlayed = false;
  });
}

function initSoundAudio(
  sound: SoundModel,
  audioContext: AudioContext,
  soundsStore: ReturnType<typeof useSoundsStore>
) {
  if (sound.source === null) {
    sound.source = audioContext.createMediaElementSource(sound.audioElement);
  }

  sound.trimGainNode = audioContext.createGain();
  sound.volumeGainNode = audioContext.createGain();
  sound.enveloppeGainNode = audioContext.createGain();

  sound.source.connect(sound.trimGainNode);
  sound.trimGainNode.connect(sound.volumeGainNode);
  sound.volumeGainNode.connect(sound.enveloppeGainNode);
  sound.enveloppeGainNode.connect(soundsStore.outputGainNode!);
}

export function pauseSound(sound: SoundModel) {
  console.log('pauseSound');
  sound.audioElement.pause();
  sound.isPlaying = false;

  disconnectAndRemoveNodes(sound);
  useSoundsStore().faderTouchedDuringPlayback = false;
  clearTimeout(sound.timeOutId);
}

export function stopSound(sound: SoundModel) {
  console.log('stopSound');
  sound.audioElement.pause();
  sound.audioElement.currentTime = sound.inTime ?? 0;
  sound.isPlaying = false;

  disconnectAndRemoveNodes(sound);
  useSoundsStore().faderTouchedDuringPlayback = false;
  clearTimeout(sound.timeOutId);
}

export function disconnectAndRemoveNodes(sound: SoundModel) {
  sound.trimGainNode?.disconnect();
  sound.volumeGainNode?.disconnect();
  sound.enveloppeGainNode?.disconnect();
  sound.trimGainNode = null;
  sound.volumeGainNode = null;
  sound.enveloppeGainNode = null;
}

export function playOrStopSound(sound: SoundModel) {
  if (sound.isPlaying) {
    stopSound(sound);
  } else {
    sound.isCuePlayed = true;
    playSound(sound);
  }
}

export function playButtonClicked() {
  const soundStore = useSoundsStore();
  const selectedSound = soundStore.selectedSound;

  if (selectedSound === null) return;

  if (selectedSound.isPlaying) {
    soundStore.stoppedByButtonClick = true;
    stopSound(selectedSound);
  } else {
    playSelectedSound();
  }
}

export function playSelectedSound() {
  const selectedSound = useSoundsStore().selectedSound;

  if (selectedSound) {
    playSound(selectedSound);
  }
}

export function stopSelectedSound() {
  const selectedSound = useSoundsStore().selectedSound;

  if (selectedSound) {
    stopSound(selectedSound);
  }
}

export function incrementSelectedSound() {
  const soundStore = useSoundsStore();
  if (soundStore.selectedSound === null) return;
  const index = soundStore.sounds[0].indexOf(soundStore.selectedSound);
  if (index < soundStore.sounds[0].length - 1) {
    setSelectedSound(soundStore.sounds[0][index + 1]);
  }
}

export function setSelectedSound(sound: SoundModel) {
  const soundStore = useSoundsStore();
  let isPlaying = false;
  soundStore.sounds[0].forEach((sound) => {
    if (sound.isPlaying) isPlaying = true;
  });
  if (!isPlaying) {
    soundStore.sounds[0].forEach((sound) => (sound.isSelected = false));
    sound.isSelected = true;
    soundStore.selectedSound = sound;
    resetSelectedSoundVolume();
  }
}

export function setSelectedSoundVolume(volume: number) {
  const soundStore = useSoundsStore();
  soundStore.selectedSoundVolume = volume;

  const selectedSound = soundStore.selectedSound;
  if (selectedSound === null) return;
  if (selectedSound.volumeGainNode === null) return;

  selectedSound.volumeGainNode!.gain.value = dbToGain(volume);
}

export function registerEventListeners(sound: SoundModel) {
  sound.audioElement.addEventListener('play', () => handlePlayEvent(sound));
  sound.audioElement.addEventListener('pause', () => handlePauseEvent(sound));
  sound.audioElement.addEventListener('timeupdate', () =>
    handleTimeUpdateEvent(sound)
  );
}

export function handlePlayEvent(sound: SoundModel) {
  sound.isPlaying = true;
}

export function handlePauseEvent(sound: SoundModel) {
  //sound.enveloppeGainNode?.gain.cancelScheduledValues(0);
  sound.isPlaying = false;
  // sound.volumeGainNode!.gain.value! = 1;
  if (!getIsCuePlayed(sound)) {
    resetSelectedSoundVolume();
    if (Date.now() - sound.launchTime > useSettingsStore().falseStartTime) {
      incrementSelectedSound();
    } else if (sound.duration < 1) incrementSelectedSound();
  }
  sound.isCuePlayed = false;
}

export function handleTimeUpdateEvent(sound: SoundModel) {
  const outTime = sound.outTime ?? sound.audioElement.duration;
  sound.remainingTime = outTime - sound.audioElement.currentTime;
}

export function getRemainingTime(sound: SoundModel) {
  const outTime = sound.outTime ?? sound.audioElement.duration;
  const inTime = sound.inTime ?? 0;
  const duration = outTime - inTime;
  return sound.isPlaying ? sound.remainingTime : duration;
}

export function resetSelectedSoundVolume() {
  useSoundsStore().selectedSoundVolume = 0.0;
}

export function setEnveloppeGainValues(
  sound: SoundModel,
  audioContext: AudioContext
) {
  const enveloppePoints = sound.enveloppePoints;

  const ctxCurrentTime = audioContext.currentTime;
  const soundCurrentTime = sound.audioElement.currentTime;

  if (sound.enveloppeGainNode === null) return;

  sound.enveloppeGainNode!.gain.setValueAtTime(
    dbToGain(getEnveloppeValueAtTime(sound, soundCurrentTime)),
    ctxCurrentTime
  );

  enveloppePoints.forEach((point, index) => {
    const gain = dbToGain(point.gainDb);
    const nextPoint = enveloppePoints[index + 1];

    if (nextPoint) {
      sound.enveloppeGainNode!.gain.exponentialRampToValueAtTime(
        dbToGain(nextPoint.gainDb),
        nextPoint.time + ctxCurrentTime - soundCurrentTime
      );
    } else {
      sound.enveloppeGainNode!.gain.setValueAtTime(gain, point.time);
    }
  });
}

export function setTrimGain(sound: SoundModel, gain: number) {
  sound.trimGain = gain;

  if (sound.trimGainNode === null) return;
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
  return getMMSSfromS(getRemainingTime(sound));
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
