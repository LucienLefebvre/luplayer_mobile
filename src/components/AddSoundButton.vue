<template>
  <div>
    <q-btn
      v-if="soundsStore.playerMode !== 'playlistAndCart'"
      fab
      icon="add"
      :color="soundsStore.playerMode === 'playlist' ? 'primary' : 'orange'"
      @click="chooseFile"
    />
    <q-fab
      v-if="soundsStore.playerMode === 'playlistAndCart'"
      fab
      icon="add"
      color="primary"
      direction="up"
      text-color="secondary"
    >
      <q-fab-action
        color="primary"
        text-color="secondary"
        @click="
          {
            soundsStore.arrayToAddSound = 'playlist';
            chooseFile();
          }
        "
        icon="splitscreen"
        style="transform: rotate(90)"
      />
      <q-fab-action
        color="primary"
        text-color="secondary"
        @click="
          {
            soundsStore.arrayToAddSound = 'cart';
            chooseFile();
          }
        "
        icon="window"
        style="transform: rotate(90)"
      />
    </q-fab>
  </div>
  <input
    ref="fileInput"
    type="file"
    @change="onFileChange"
    hidden
    multiple
    accept=".wav, .mp3"
  />
  <q-dialog v-model="showLoadingDialog" persistent seamless position="bottom"
    ><q-linear-progress :value="progression" size="20px" />
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
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
  /*   const response = await fetch(soundFileUrl);
  const blob = await response.blob();
  const file = new File([blob], 'son.mp3', { type: 'audio/mpeg' });
  const audioElement = document.createElement('audio');
  const url = URL.createObjectURL(file);
  audioElement.src = url;
  audioElement.preload = 'metadata';

  soundsStore.loadSound(audioElement, file.name); */
});

const filesLoaded = ref(false);
async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files;

  if (files === null || files.length === 0 || input.files === null) {
    return;
  }

  showLoadingDialog.value = true;
  soundsStore.numberOfSoundsToLoad = files.length;

  const allowedExtensions = ['.wav', '.mp3', '.ogg', '.flac', '.WAV', '.MP3'];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const isValidExtension = allowedExtensions.some((ext) =>
      file.name.endsWith(ext)
    );

    if (!isValidExtension) {
      alert('Invalid file type. Please select a .wav or .mp3 file.');
      input.value = '';
      soundsStore.numberOfSoundsToLoad--;
      resetLoadCounter();
      return;
    }

    const audioElement = document.createElement('audio');
    const url = URL.createObjectURL(file);
    audioElement.src = url;
    audioElement.preload = 'metadata';

    try {
      await soundsStore.loadSound(audioElement, input.files[i].name);
    } catch (error) {
      const errorString = `Could not load sound file : ${file.name}`;
      $q.notify({
        message: errorString,
        color: 'red',
        type: 'negative',
        position: 'top',
      });
      resetLoadCounter();
    }
  }
}

const progression = ref(0);
const showLoadingDialog = ref(false);
watch(
  () => soundsStore.numberOfLoadedSounds,
  (newValue: number) => {
    progression.value = newValue / soundsStore.numberOfSoundsToLoad;
    console.log(progression.value);
    if (newValue === soundsStore.numberOfSoundsToLoad) {
      setTimeout(() => {
        resetLoadCounter();
      }, 2000);
    }
  }
);

function resetLoadCounter() {
  soundsStore.numberOfSoundsToLoad = 0;
  soundsStore.numberOfLoadedSounds = 0;
  showLoadingDialog.value = false;
  progression.value = 0;
}
</script>

<style scoped></style>
