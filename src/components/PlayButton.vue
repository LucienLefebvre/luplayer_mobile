<template>
  <div>
    <q-btn
      :color="buttonColor()"
      :label="buttonLabel()"
      class="button"
      @click="soundsStore.playButtonClicked"
    />
  </div>
</template>

<script setup lang="ts">
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from '../stores/settings-store';
import { watch } from 'vue';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

function buttonColor() {
  if (soundsStore.selectedSound === null || undefined) return 'orange';
  if (soundsStore.selectedSound.isPlaying) {
    if (soundsStore.selectedSound?.remainingTime === undefined) return 'green';
    if (soundsStore.selectedSound?.remainingTime < 5) {
      return 'red';
    } else return 'green';
  } else {
    return 'orange';
  }
}

function buttonLabel() {
  if (soundsStore.selectedSound === null || undefined) return 'play';
  if (soundsStore.selectedSound.isPlaying) {
    return soundsStore.selectedSound?.remainingTime.toFixed(0);
  } else {
    return 'play';
  }
}

watch(
  () => soundsStore.selectedSoundVolume,
  (value) => {
    if (
      value === -60 &&
      soundsStore.selectedSound?.isPlaying &&
      settingsStore.faderStop
    ) {
      soundsStore.stopSelectedSound();
    }
  }
);
</script>

<style scoped>
.button {
  width: 100%;
  font-size: 30px;
  align-items: center;
}
</style>
