<template>
  <div>
    <q-btn
      :color="buttonColor()"
      :label="buttonLabel()"
      class="button"
      @click="handleClick"
    />
  </div>
</template>

<script setup lang="ts">
import { useSoundsStore } from '../stores/sounds-store';
import {
  playButtonClicked,
  playButtonDoubleClicked,
  getRemainingTime,
  getSoundDurationLabel,
} from 'src/composables/sound-controller';

const soundsStore = useSoundsStore();

let timeOfLastClick = 0;

function handleClick() {
  const now = new Date().getTime();
  if (now - timeOfLastClick < 300) {
    playButtonDoubleClicked();
  } else {
    playButtonClicked();
  }
  timeOfLastClick = now;
}

function buttonColor() {
  const selectedSound = soundsStore.playlistActiveSound;
  if (selectedSound === null || undefined) return 'orange';
  if (selectedSound.isPlaying) {
    if (getRemainingTime(selectedSound) === undefined) return 'green';
    else if (getRemainingTime(selectedSound) < 5) {
      return 'red';
    } else return 'green';
  } else {
    return 'orange';
  }
}

function buttonLabel() {
  if (soundsStore.playlistActiveSound === null || undefined) return 'play';
  if (soundsStore.playlistActiveSound.isPlaying) {
    return getSoundDurationLabel(soundsStore.playlistActiveSound);
  } else {
    return 'play';
  }
}
</script>

<style scoped>
.button {
  width: 100%;
  font-size: 32px;
  align-items: center;
}
</style>
