<template>
  <div>
    <q-btn
      fab
      icon="add"
      :color="soundsStore.playerMode === 'playlist' ? 'blue' : 'orange'"
      @click="chooseFile"
    />
  </div>
  <input
    ref="fileInput"
    type="file"
    @change="onFileChange"
    hidden
    multiple
    accept=".wav, .mp3"
  />
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
  /*   const fileInput = event.target as HTMLInputElement;

  if (!fileInput.files) return;

  for (let i = 0; i < fileInput.files.length; i++) {
    if (
      !['.wav', '.mp3'].includes(
        fileInput.name.slice(((fileInput.name.lastIndexOf('.') - 1) >>> 0) + 2)
      )
    ) {
      alert('Invalid file type');
      return;
    }
    soundsStore.loadSound(fileInput.files[i].name, fileInput.files[i]);
  } */
  const input = event.target as HTMLInputElement;
  const files = input.files;

  if (files === null || files.length === 0 || input.files === null) {
    return;
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const allowedExtensions = ['.wav', '.mp3', '.ogg', '.flac', '.WAV', '.MP3'];

    const isValidExtension = allowedExtensions.some((ext) =>
      file.name.endsWith(ext)
    );

    if (!isValidExtension) {
      alert('Invalid file type. Please select a .wav or .mp3 file.');
      input.value = '';
      return;
    }

    soundsStore.loadSound(input.files[i].name, input.files[i]);
  }
}
</script>

<style scoped></style>
