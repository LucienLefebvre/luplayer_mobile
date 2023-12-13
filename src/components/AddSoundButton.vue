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
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useSoundsStore } from '../stores/sounds-store';

const soundsStore = useSoundsStore();
const $q = useQuasar();

const fileInput = ref<HTMLInputElement | null>(null);
function chooseFile() {
  if (fileInput?.value) {
    fileInput.value.value = '';
    fileInput.value.click();
  }
}
import soundFileUrl from '../assets/son.mp3';

onMounted(async () => {
  const response = await fetch(soundFileUrl);
  const blob = await response.blob();
  const file = new File([blob], 'son.mp3', { type: 'audio/mpeg' });
  const audioElement = document.createElement('audio');
  const url = URL.createObjectURL(file);
  audioElement.src = url;
  audioElement.preload = 'metadata';

  soundsStore.loadSound(audioElement, file.name);
});

function onFileChange(event: Event) {
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

    const audioElement = document.createElement('audio');
    const url = URL.createObjectURL(file);
    audioElement.src = url;
    audioElement.preload = 'metadata';

    soundsStore.loadSound(audioElement, input.files[i].name);

    audioElement.onerror = () => {
      const errorString = `Could not load sound file : ${file.name}`;
      $q.notify({
        message: errorString,
        color: 'red',
        type: 'negative',
        position: 'top',
      });
    };
  }
}
</script>

<style scoped></style>
