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

const soundsStore = useSoundsStore();

function buttonColor() {
  if (soundsStore.isPlaying) {
    return 'green';
  } else {
    return 'orange';
  }
}

function buttonLabel() {
  if (soundsStore.isPlaying) {
    return soundsStore.selectedSound?.remainingTime.toFixed(0);
  } else {
    return 'play';
  }
}
</script>

<style scoped>
.button {
  width: 100%;
  font-size: 30px;
  align-items: center;
}
</style>
