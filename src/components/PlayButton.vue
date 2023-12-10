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
import { useSettingsStore } from '../stores/settings-store';

import {
  playButtonClicked,
  getRemainingTime,
  getSoundDurationLabel,
} from 'src/composables/sound-controller';

const soundsStore = useSoundsStore();

function buttonColor() {
  const selectedSound = soundsStore.selectedSound;
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
  if (soundsStore.selectedSound === null || undefined) return 'play';
  if (soundsStore.selectedSound.isPlaying) {
    return getSoundDurationLabel(soundsStore.selectedSound);
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
