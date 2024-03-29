import { SoundModel } from 'src/components/models';
import { dbToGain, gainToDb, getMMSSfromS } from 'src/scripts/math-helpers';
import init, {
  calculate_r128_integrated_loudness,
} from 'src/rust/waveform_process/pkg';
import { useSoundsStore } from 'src/stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';

export function playSound(
  sound: SoundModel,
  isCuePlayed: boolean,
  fadeIn: boolean
) {
  const soundsStore = useSoundsStore();
  const settingsStore = useSettingsStore();
  const audioContext = soundsStore.audioContext;
  if (audioContext === null) return;

  if (!sound.soundAudioHasBeenInitialized)
    initSoundAudio(sound, audioContext, soundsStore);
  if (!sound.trimGainNode || !sound.volumeGainNode || !sound.enveloppeGainNode)
    return;

  sound.trimGainNode.gain.value = dbToGain(sound.trimDb);

  if (!isCuePlayed) {
    sound.audioElement.currentTime = sound.inTime ?? 0;
  }

  /*   if (soundsStore.selectedSound === sound) {
    sound.volumeGainNode.gain.value = dbToGain(soundsStore.selectedSoundVolume);
  } */
  sound.volumeGainNode.gain.value = dbToGain(sound.volumeDb);

  if ((sound.enveloppePoints, sound.enveloppePoints.length > 0)) {
    setEnveloppeGainValues(sound);
  }

  if (fadeIn) {
    const fadeTime = settingsStore.defaultFadeInTime / 1000;
    sound.trimGainNode.gain.setValueAtTime(0.005, audioContext.currentTime);
    sound.trimGainNode.gain.exponentialRampToValueAtTime(
      dbToGain(sound.trimDb),
      audioContext.currentTime + fadeTime
    );
    sound.isFadingIn = true;
    sound.fadeInStartTime = Date.now();

    sound.fadeInTimeoutId = setTimeout(() => {
      sound.isFadingIn = false;
    }, fadeTime * 1000);
  }

  sound.isCuePlayed = isCuePlayed;
  sound.audioElement.play();

  sound.isPlaying = true;
  sound.launchTime = Date.now();
  clearTimeout(sound.timeOutId);

  if (sound.outTime !== null && !isCuePlayed && !sound.isLooping) {
    const inTime = sound.inTime !== null ? sound.inTime : 0;
    const timeOutDuration = (sound.outTime - inTime) * 1000;

    sound.timeOutId = setTimeout(() => {
      pauseSound(sound);
      sound.audioElement.currentTime = 0;
    }, timeOutDuration);
  }
  if (sound.isLooping) {
    loopSound(sound);
  }

  sound.audioElement.addEventListener('ended', () => {
    if (!sound.enveloppeGainNode || sound.isLooping) return;

    sound.enveloppeGainNode.gain.cancelScheduledValues(0);
    stopSound(sound);
    sound.isCuePlayed = false;
  });
}

function loopSound(sound: SoundModel) {
  sound.audioElement.loop = true;
  if (sound.outTime !== null) {
    const inTime = sound.inTime ?? 0;
    const timeOutDuration = (sound.outTime - inTime) * 1000;

    if (sound.timeOutId) clearTimeout(sound.timeOutId);

    sound.timeOutId = setTimeout(() => {
      sound.audioElement.currentTime = sound.inTime ?? 0;
      loopSound(sound);
    }, timeOutDuration);
  }
}

export function initSoundAudio(
  sound: SoundModel,
  audioContext: AudioContext,
  soundsStore: ReturnType<typeof useSoundsStore>
) {
  if (soundsStore.outputGainNode === null) return;
  if (sound.source === null) {
    sound.source = audioContext.createMediaElementSource(sound.audioElement);
  }

  sound.trimGainNode = audioContext.createGain();
  sound.volumeGainNode = audioContext.createGain();
  sound.enveloppeGainNode = audioContext.createGain();

  sound.source.connect(sound.trimGainNode);
  sound.trimGainNode.connect(sound.volumeGainNode);
  sound.volumeGainNode.connect(sound.enveloppeGainNode);
  sound.enveloppeGainNode.connect(soundsStore.outputGainNode);

  sound.soundAudioHasBeenInitialized = true;
}

export function pauseSound(sound: SoundModel) {
  sound.audioElement.pause();
  sound.isPlaying = false;

  if (!isCartSound(sound)) sound.volumeDb = 0;

  clearTimeout(sound.timeOutId);
}

export function stopSound(sound: SoundModel, stoppedByFader = false) {
  sound.audioElement.pause();
  sound.audioElement.currentTime = 0;
  sound.isPlaying = false;

  if (!isCartSound(sound) || stoppedByFader) {
    if (sound.volumeGainNode !== null) sound.volumeGainNode.gain.value = 1;
    sound.volumeDb = 0;
  }

  clearTimeout(sound.timeOutId);
  clearFades(sound);
}

function clearFades(sound: SoundModel) {
  sound.trimGainNode?.gain.cancelScheduledValues(0);
  clearTimeout(sound.fadeInTimeoutId);
  clearTimeout(sound.fadeOutTimeoutId);
  sound.isFadingIn = false;
  sound.isFadingOut = false;
}

export function playOrStopSound(
  sound: SoundModel,
  isCuePlayed = true,
  isDoubleTap = false,
  selectSound = false
) {
  const settingsStore = useSettingsStore();

  if (sound.isPlaying) {
    if (settingsStore.doubleTapToStop && isDoubleTap) {
      stopSound(sound);
    } else if (!settingsStore.doubleTapToStop) {
      stopSound(sound);
    }
  } else {
    playSound(sound, isCuePlayed, false);
    if (selectSound) setSelectedSound(sound);
  }
}

export function playButtonClicked() {
  const soundStore = useSoundsStore();
  const settingsStore = useSettingsStore();

  const selectedSound = soundStore.playlistActiveSound;

  if (selectedSound === null) return;

  if (selectedSound.isPlaying && !settingsStore.doubleTapToStop) {
    soundStore.stoppedByButtonClick = true;
    stopSound(selectedSound);
  } else if (!selectedSound.isPlaying) {
    playSelectedSound();
  }
}

export function playButtonDoubleClicked() {
  const soundStore = useSoundsStore();
  const settingsStore = useSettingsStore();

  const selectedSound = soundStore.playlistActiveSound;

  if (selectedSound === null) return;

  if (selectedSound.isPlaying && settingsStore.doubleTapToStop) {
    soundStore.stoppedByButtonClick = true;
    stopSound(selectedSound);
  }
}

export function playSelectedSound() {
  const selectedSound = useSoundsStore().playlistActiveSound;

  if (selectedSound) {
    playSound(selectedSound, false, false);
  }
}

export function stopPlaylistActiveSound() {
  const activeSound = useSoundsStore().playlistActiveSound;

  if (activeSound) {
    stopSound(activeSound);
  }
}

export function playSoundWithFadeIn(sound: SoundModel) {
  playSound(sound, false, true);
}

export function stopSoundWithFadeOut(sound: SoundModel) {
  if (!sound.trimGainNode) return;

  const soundsStore = useSoundsStore();
  const audioContext = soundsStore.audioContext;
  if (audioContext === null) return;

  sound.trimGainNode.gain.setValueAtTime(
    dbToGain(sound.trimDb),
    audioContext.currentTime
  );

  const remainingTime = getRemainingTime(sound);
  const rampTime = Math.min(
    useSettingsStore().defaultFadeOutTime / 1000,
    remainingTime
  );
  sound.trimGainNode.gain.exponentialRampToValueAtTime(
    0.005,
    audioContext.currentTime + rampTime
  );

  sound.isFadingOut = true;
  sound.fadeOutStartTime = Date.now();

  sound.fadeOutTimeoutId = setTimeout(() => {
    stopSound(sound);
    sound.isFadingOut = false;
  }, rampTime * 1000);
}

export function incrementPlaylistActiveSound() {
  const soundStore = useSoundsStore();
  if (soundStore.playlistActiveSound === null) return;

  const index = soundStore.playlistSounds.indexOf(
    soundStore.playlistActiveSound
  );

  if (index < soundStore.playlistSounds.length - 1) {
    const soundTarget = soundStore.playlistSounds[index + 1];
    setPlaylistActiveSound(soundTarget);
    if (isPlaylistSound(soundStore.selectedSound)) {
      setSelectedSound(soundTarget);
    }
  }
}

export function findSoundArray(sound: SoundModel): SoundModel[] | null {
  const soundStore = useSoundsStore();
  let array = null;
  if (soundStore.playlistSounds.includes(sound)) {
    array = soundStore.playlistSounds;
  } else if (soundStore.cartSounds0.includes(sound)) {
    array = soundStore.cartSounds0;
  } else if (soundStore.cartSounds1.includes(sound)) {
    array = soundStore.cartSounds1;
  }
  return array;
}

export function setSelectedSound(sound: SoundModel, resetVolume = true) {
  if (sound === null || sound === undefined) return;
  console.log('setSelectedSound', sound);
  const soundStore = useSoundsStore();

  soundStore.playlistSounds.forEach((sound) => (sound.isSelected = false));
  soundStore.cartSounds0.forEach((sound) => (sound.isSelected = false));
  soundStore.cartSounds1.forEach((sound) => (sound.isSelected = false));

  sound.isSelected = true;
  soundStore.selectedSound = sound;
  if (resetVolume && !isCartSound(sound)) {
    sound.volumeDb = 0;
    resetSelectedSoundVolume();
  }
  if (sound.volumeGainNode !== null) {
    soundStore.selectedSoundVolume = gainToDb(sound.volumeGainNode.gain.value);
  }
}

export function setSoundVolumeDB(sound: SoundModel, volume: number) {
  sound.volumeDb = volume;
  if (sound.volumeGainNode === null) return;
  sound.volumeGainNode.gain.value = dbToGain(volume);
}

export function resetSelectedSoundVolume() {
  const soundStore = useSoundsStore();
  if (soundStore.faderTouchedDuringPlayback) return;
  soundStore.selectedSoundVolume = 0.0;
}

export function setSelectedSoundVolume(volume: number) {
  const soundStore = useSoundsStore();
  soundStore.selectedSoundVolume = volume;

  let selectedSound;
  if (soundStore.playerMode === 'cart') {
    selectedSound = soundStore.selectedSound;
  } else {
    selectedSound = soundStore.playlistActiveSound;
  }
  if (selectedSound === null) return;

  selectedSound.volumeDb = volume;

  if (selectedSound.volumeGainNode === null) return;
  selectedSound.volumeGainNode.gain.value = dbToGain(volume);
}

export function registerEventListeners(sound: SoundModel) {
  sound.audioElement.addEventListener('play', () => handlePlayEvent(sound));
  sound.audioElement.addEventListener('pause', () => handlePauseEvent(sound));
  sound.audioElement.addEventListener('timeupdate', () =>
    handleTimeUpdateEvent(sound)
  );
}

export function unregisterEventListeners(sound: SoundModel) {
  sound.audioElement.removeEventListener('play', () => handlePlayEvent(sound));
  sound.audioElement.removeEventListener('pause', () =>
    handlePauseEvent(sound)
  );
  sound.audioElement.removeEventListener('timeupdate', () =>
    handleTimeUpdateEvent(sound)
  );
}

export function handlePlayEvent(sound: SoundModel) {
  sound.isPlaying = true;
}

export function handlePauseEvent(sound: SoundModel) {
  sound.isPlaying = false;
  if (!getIsCuePlayed(sound) && isPlaylistActiveSound(sound)) {
    resetSelectedSoundVolume();
    if (isCartSound(sound)) return;
    if (Date.now() - sound.launchTime > useSettingsStore().falseStartTime) {
      incrementPlaylistActiveSound();
    } else if (sound.duration < 1) incrementPlaylistActiveSound();
  }
  sound.isCuePlayed = false;
}

export function handleTimeUpdateEvent(sound: SoundModel) {
  const outTime = sound.outTime ?? sound.audioElement.duration;
  sound.remainingTime = outTime - sound.audioElement.currentTime;

  if (
    (sound.enveloppePoints, sound.enveloppePoints.length > 0 && sound.isPlaying)
  ) {
    if (sound.enveloppeGainNode === null) return;
    sound.enveloppeGainNode.gain.cancelScheduledValues(0);
    setEnveloppeGainValues(sound);
  }
}

export function getRemainingTime(sound: SoundModel) {
  const outTime = sound.outTime ?? sound.audioElement.duration;
  const inTime = sound.inTime ?? 0;
  const duration = outTime - inTime;
  return sound.isPlaying
    ? sound.remainingTime / sound.audioElement.playbackRate
    : duration;
}

export function isCartSound(sound: SoundModel | null) {
  if (sound === null) return false;
  return (
    useSoundsStore().cartSounds0.includes(sound) ||
    useSoundsStore().cartSounds1.includes(sound)
  );
}

export function isPlaylistSound(sound: SoundModel | null) {
  if (sound === null) return false;
  return useSoundsStore().playlistSounds.includes(sound);
}

export function isPlaylistActiveSound(sound: SoundModel) {
  return sound === useSoundsStore().playlistActiveSound;
}

export function isSelectedSound(sound: SoundModel) {
  return useSoundsStore().selectedSound === sound;
}

export function setPlaylistActiveSound(sound: SoundModel, setSelected = false) {
  const soundsStore = useSoundsStore();

  if (
    soundsStore.playlistActiveSound &&
    soundsStore.playlistActiveSound.isPlaying &&
    !isPlaylistActiveSound(sound)
  ) {
    return;
  }
  soundsStore.playlistSounds.forEach((sound) => {
    sound.isPlaylistActiveSound = false;
  });
  sound.isPlaylistActiveSound = true;
  soundsStore.playlistActiveSound = sound;

  if (setSelected) setSelectedSound(sound);
}

export function setEnveloppeGainValues(sound: SoundModel) {
  const soundStore = useSoundsStore();
  const audioContext = soundStore.audioContext;
  if (audioContext === null) return;
  if (sound.enveloppeGainNode === null) return;

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

    if (sound.enveloppeGainNode === null) return;
    if (nextPoint) {
      const timteOfPoint = nextPoint.time + ctxCurrentTime - soundCurrentTime;
      if (timteOfPoint > 0) {
        sound.enveloppeGainNode.gain.exponentialRampToValueAtTime(
          dbToGain(nextPoint.gainDb),
          nextPoint.time + ctxCurrentTime - soundCurrentTime
        );
      }
    } else {
      sound.enveloppeGainNode.gain.setValueAtTime(gain, point.time);
    }
  });
}

export function setTrimGain(sound: SoundModel, gain: number) {
  sound.trimDb = gain;

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
  if (sound.integratedLoudness === null) {
    const soundsStore = useSoundsStore();
    soundsStore.loudnessBeingCalculatedSounds.push(sound.id);

    const buffer = await fetch(sound.audioElement.src).then((response) =>
      response.arrayBuffer()
    );
    const audioBuffer = await new AudioContext().decodeAudioData(buffer);
    const leftChannelData = audioBuffer.getChannelData(0);
    let rightChannelData = null as Float32Array | null;
    if (audioBuffer.numberOfChannels > 1) {
      rightChannelData = audioBuffer.getChannelData(1);
    }

    init().then(() => {
      const loudness = calculate_r128_integrated_loudness(
        leftChannelData,
        rightChannelData === null ? leftChannelData : rightChannelData,
        audioBuffer.sampleRate
      );

      soundsStore.loudnessBeingCalculatedSounds =
        soundsStore.loudnessBeingCalculatedSounds.filter(
          (id) => id !== sound.id
        );

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
  if (loudness === Number.NEGATIVE_INFINITY) return 0;
  else return Math.round((-23 + targetValue - loudness) * 10) / 10;
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

export function getSoundColor(sound: SoundModel) {
  return sound.color;
}
