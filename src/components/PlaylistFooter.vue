<template>
  <div class="container">
    <q-linear-progress
      rounded
      size="15px"
      :value="soundsStore.getSoundProgress()"
      class="q-mt-md"
    />
    <PlayButton class="button" />
  </div>
</template>

<script setup lang="ts">
import { useSoundsStore } from '../stores/example-store';
import PlayButton from '../components/PlayButton.vue';

const soundsStore = useSoundsStore();
</script>

<style scoped>
.container {
  display: grid;
  place-items: center;
}
</style>
