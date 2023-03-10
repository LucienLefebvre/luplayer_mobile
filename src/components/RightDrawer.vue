<template>
  <q-page class="column items-center justify-evenly">
    <div v-if="soundsStore.editedSound != null">
      <SoundDetails :sound="soundsStore.editedSound" />
    </div>
    <div v-else>No sound selected</div>
  </q-page>
</template>

<script setup lang="ts">
import SoundDetails from './SoundDetails.vue';
import { useSoundsStore } from '../stores/sounds-store';
const soundsStore = useSoundsStore();
</script>

<style scoped></style>
