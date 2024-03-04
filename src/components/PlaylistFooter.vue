<template>
  <div class="container">
    <SoundProgressBar ref="progressBar" />
    <PlayButton class="button" />
  </div>
</template>

<script setup lang="ts">
import { useSoundsStore } from '../stores/sounds-store';
import PlayButton from '../components/PlayButton.vue';
import SoundProgressBar from './SoundProgressBar.vue';
import { watch, ref, onMounted } from 'vue';

const soundsStore = useSoundsStore();

const progressBar = ref<typeof SoundProgressBar | null>(null);

watch(
  () => soundsStore.playlistActiveSound,
  () => {
    console.log('playlistActiveSound changed');
    if (soundsStore.playlistActiveSound)
      progressBar.value?.setSound(soundsStore.playlistActiveSound);
  }
);
</script>

<style scoped>
.container {
  display: grid;
  place-items: center;
  border-top: 2px solid var(--blueColor);
}
</style>
