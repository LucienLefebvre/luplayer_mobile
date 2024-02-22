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

  if (!files || files.length === 0) {
    return;
  }

  await processFiles(files, input);
}

async function processFiles(files: FileList, input: HTMLInputElement) {
  showLoadingDialog.value = true;
  soundsStore.numberOfSoundsToLoad = files.length;

  const allowedExtensions = ['.wav', '.mp3', '.ogg', '.flac', '.WAV', '.MP3'];

  for (const file of Array.from(files)) {
    if (!allowedExtensions.some((ext) => file.name.endsWith(ext))) {
      soundsStore.numberOfSoundsToLoad--;
      $q.notify({
        message: `Invalid file format : ${file.name}`,
        color: 'red',
        type: 'negative',
        position: 'top',
      });
      resetLoadCounter();
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = async function (event) {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const blob = new Blob([arrayBuffer], { type: file.type });

          const audioElement = document.createElement('audio');
          const objectUrl = URL.createObjectURL(blob);
          audioElement.src = audioElement.src = objectUrl;
          audioElement.preload = 'metadata';

          await soundsStore.loadSound(audioElement, file.name, arrayBuffer);

          resolve();
        } catch (error) {
          $q.notify({
            message: `Could not load sound file : ${file.name}`,
            color: 'red',
            type: 'negative',
            position: 'top',
          });
          resetLoadCounter();
          reject(error);
        }
      };
    });
  }
}

const progression = ref(0);
const showLoadingDialog = ref(false);
watch(
  () => soundsStore.numberOfLoadSaveSounds,
  (newValue: number) => {
    progression.value = newValue / soundsStore.numberOfSoundsToLoad;
    if (newValue === soundsStore.numberOfSoundsToLoad) {
      setTimeout(() => {
        resetLoadCounter();
      }, 2000);
    }
  }
);

function resetLoadCounter() {
  soundsStore.numberOfSoundsToLoad = 0;
  soundsStore.numberOfLoadSaveSounds = 0;
  showLoadingDialog.value = false;
  progression.value = 0;
}
</script>

<style scoped></style>
