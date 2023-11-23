<template>
  <div class="container">
    <SoundProgressBar
      :sound="soundsStore.selectedSound"
      :is-main-toolbar="true"
    />
    <PlayButton class="button" />
  </div>
</template>

<script setup lang="ts">
import { useSoundsStore } from '../stores/sounds-store';
import PlayButton from '../components/PlayButton.vue';
import SoundProgressBar from './SoundProgressBar.vue';

const soundsStore = useSoundsStore();
</script>

<style scoped>
.container {
  display: grid;
  place-items: center;
  border-top: 2px solid var(--blueColor);
}
</style>
