<template>
  <div class="column q-py-sm">
    <div
      class="row justify-center volumeLabel"
      style="height: 5%"
      @dblclick="soundsStore.selectedSoundVolume = 0"
    >
      {{ soundsStore.selectedSoundVolume }}dB
    </div>
    <div class="row justify-center" style="height: 85%">
      <q-slider
        style="height: 100%"
        vertical
        reverse
        v-model="soundsStore.selectedSoundVolume"
        :min="-60"
        :max="12"
        :step="0.1"
        color="orange"
        thumb-size="40px"
        track-size="8px"
      />
    </div>
    <div class="row justify-center q-pa-sm">
      <q-page-sticky position="bottom-right" :offset="[18, 18]">
        <q-btn fab icon="add" color="blue" @click="chooseFile" />
      </q-page-sticky>
      <input
        ref="fileInput"
        type="file"
        @change="onFileChange"
        hidden
        multiple
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { dbToGain } from '../composables/math-helpers';
const soundsStore = useSoundsStore();

const fileInput = ref<HTMLInputElement | null>(null);

function chooseFile() {
  if (fileInput?.value) {
    fileInput.value.click();
  }
}

function onFileChange(event: Event) {
  const fileInput = event.target as HTMLInputElement;

  if (!fileInput.files) return;

  for (let i = 0; i < fileInput.files.length; i++) {
    soundsStore.loadSound(fileInput.files[i].name, fileInput.files[i]);
  }
}

watch(
  () => soundsStore.selectedSoundVolume,
  (newValue: number) => {
    if (soundsStore.selectedSound !== null) {
      soundsStore.selectedSound.volumeGainNode.gain.value = dbToGain(newValue);
    }
  }
);
</script>

<style scoped>
.volumeLabel {
  font-size: 1rem;
  color: orange;
}
</style>
