<template>
  <div class="playlist-toolbar">
    <q-btn icon="vertical_align_top" class="icon" @click="upButtonClicked" />
    <q-btn icon="low_priority" class="icon" @click="reorderButtonClicked" />
    <q-btn icon="edit" class="icon" @click="editButtonClicked" />
    <q-btn icon="delete" class="icon" @click="deleteButtonClicked" />
    <q-btn class="icon" @click="fadeButtonClicked">
      <svg
        width="24"
        height="24"
        viewBox="0 0 256 256"
        xmlns="http://www.w3.org/2000/svg"
        fill="orange"
      >
        <path :d="getSvgPath()" fill-rule="evenodd" />
      </svg>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import {
  playSoundWithFadeIn,
  setSelectedSound,
  stopSoundWithFadeOut,
} from 'src/composables/sound-controller';
import { useSoundsStore } from '../stores/sounds-store';

const soundsStore = useSoundsStore();

function upButtonClicked() {
  if (soundsStore.selectedSound === null) return;
  if (soundsStore.selectedSound.isPlaying) return;
  if (soundsStore.sounds[0][0]) {
    setSelectedSound(soundsStore.sounds[0][0]);
  }
}

function reorderButtonClicked() {
  if (soundsStore.sounds[0].length === 0 && soundsStore.sounds[1].length === 0)
    return;
  soundsStore.showReorderWindow = !soundsStore.showReorderWindow;
}

function editButtonClicked() {
  if (soundsStore.selectedSound === null) return;
  soundsStore.editedSound = soundsStore.selectedSound;
  soundsStore.showEditWindow = true;
}

function deleteButtonClicked() {
  if (soundsStore.selectedSound === null) return;
  soundsStore.showDeleteSoundWindow = true;
}

function getSvgPath() {
  if (soundsStore.selectedSound === null) return getFadeInSvgPath();
  if (soundsStore.selectedSound.isPlaying) return getFadeOutSvgPath();
  return getFadeInSvgPath();
}
function getFadeInSvgPath() {
  return 'M36 208c-2.21 0-2.619-1.144-.926-2.546L220.926 51.546c1.698-1.406 3.074-.76 3.074 1.464v150.98a4.003 4.003 0 0 1-3.996 4.01h-8.008a3.996 3.996 0 0 1-3.996-4.007V84.007c0-2.213-1.387-2.861-3.079-1.465L56.08 205.458C54.379 206.862 51.209 208 49 208H35.999z';
}

function getFadeOutSvgPath() {
  return 'M222.032 208c2.208 0 2.618-1.144.925-2.546L37.105 51.546c-1.698-1.406-3.074-.76-3.074 1.464v150.98a4.003 4.003 0 0 0 3.996 4.01h8.008a3.996 3.996 0 0 0 3.996-4.007V84.007c0-2.213 1.387-2.861 3.079-1.465l148.842 122.916c1.7 1.404 4.87 2.542 7.078 2.542h13.002z';
}

function fadeButtonClicked() {
  if (soundsStore.selectedSound === null) return;
  if (soundsStore.selectedSound.isPlaying) {
    stopSoundWithFadeOut(soundsStore.selectedSound);
  } else {
    playSoundWithFadeIn(soundsStore.selectedSound);
  }
}
</script>

<style scoped>
.playlist-toolbar {
  background-color: var(--darkColor);
  border-bottom: 2px solid orange;

  display: flex;
  flex-direction: row;
  justify-content: space-around;
  padding: 5px;
  height: 50px;
}

.icon {
  color: orange;
  background-color: var(--blueColor);
}
</style>
