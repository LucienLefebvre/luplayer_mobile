<template>
  <div>
    <q-btn
      fab
      icon="add"
      :color="soundsStore.playerMode === 'playlist' ? 'blue' : 'orange'"
      @click="chooseFile"
    />
  </div>
  <input ref="fileInput" type="file" @change="onFileChange" hidden multiple />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
const soundsStore = useSoundsStore();

const fileInput = ref<HTMLInputElement | null>(null);
function chooseFile() {
  if (fileInput?.value) {
    fileInput.value.value = '';
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
</script>

<style scoped></style>
