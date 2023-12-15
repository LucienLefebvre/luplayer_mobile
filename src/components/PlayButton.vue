<template>
  <div>
    <q-btn
      :color="buttonColor()"
      :label="buttonLabel()"
      class="button"
      @click="playButtonClicked"
    />
  </div>
</template>

<script setup lang="ts">
import { useSoundsStore } from '../stores/sounds-store';
import {
  playButtonClicked,
  getRemainingTime,
  getSoundDurationLabel,
} from 'src/composables/sound-controller';

const soundsStore = useSoundsStore();

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
