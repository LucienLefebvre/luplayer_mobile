<template>
  <div class="busy-round">
    <q-circular-progress
      v-if="shouldShowBusyRound"
      indeterminate
      color="var(--orangeColor)"
      size="20px"
    />
  </div>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue';
import { useSoundsStore } from 'src/stores/sounds-store';
const soundsStore = useSoundsStore();

const shouldShowBusyRound = ref(false);

watch(
  [
    () => soundsStore.waveformBeingCalculatedSounds,
    () => soundsStore.loudnessBeingCalculatedSounds,
  ],
  ([waveformSounds, loudnessSounds]) => {
    shouldShowBusyRound.value =
      waveformSounds.length > 0 && loudnessSounds.length > 0;
  }
);
</script>

<style scoped>
.busy-round {
  width: 20px;
}
</style>
