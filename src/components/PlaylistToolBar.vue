<template>
  <div class="playlist-toolbar">
    <q-btn
      flat
      icon="skip_previous"
      class="icon"
      @click="previousButtonClicked"
      size="sm"
      v-show="soundsStore.playerMode === 'playlist' || 'playlistAndCart'"
    />
    <q-btn
      icon="vertical_align_top"
      class="icon"
      @click="upButtonClicked"
      size="sm"
      v-show="soundsStore.playerMode === 'playlist' || 'playlistAndCart'"
    />
    <q-btn
      icon="skip_next"
      class="icon"
      @click="nextButtonClicked"
      size="sm"
      v-show="soundsStore.playerMode === 'playlist' || 'playlistAndCart'"
    />
    <q-btn
      icon="low_priority"
      :class="getReorderButtonClass()"
      @click="reorderButtonClicked()"
      @contextmenu.prevent
      size="sm"
      ref="reorderButton"
    />
    <q-btn icon="edit" class="icon" @click="editButtonClicked" size="sm" />
    <q-btn icon="delete" class="icon" @click="deleteButtonClicked" size="sm" />
    <q-btn class="icon" @click="fadeButtonClicked" size="sm">
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
import { ref } from 'vue';
import {
  playSoundWithFadeIn,
  setPlaylistActiveSound,
  setSelectedSound,
  stopSoundWithFadeOut,
} from 'src/composables/sound-controller';
import { useSoundsStore } from '../stores/sounds-store';
import { onLongPress } from '@vueuse/core';

const soundsStore = useSoundsStore();

function nextButtonClicked() {
  if (soundsStore.playlistActiveSound === null) return;
  if (soundsStore.playlistActiveSound.isPlaying) return;
  const index = soundsStore.playlistSounds.indexOf(
    soundsStore.playlistActiveSound
  );
  if (index === soundsStore.playlistSounds.length - 1) return;
  setPlaylistActiveSound(soundsStore.playlistSounds[index + 1], true);
}

function previousButtonClicked() {
  if (soundsStore.playlistActiveSound === null) return;
  if (soundsStore.playlistActiveSound.isPlaying) return;
  const index = soundsStore.playlistSounds.indexOf(
    soundsStore.playlistActiveSound
  );
  if (index === 0) return;
  setPlaylistActiveSound(soundsStore.playlistSounds[index - 1], true);
}
function upButtonClicked() {
  if (soundsStore.playlistActiveSound === null) return;
  if (soundsStore.playlistActiveSound.isPlaying) return;
  if (soundsStore.playlistSounds[0]) {
    setPlaylistActiveSound(soundsStore.playlistSounds[0], true);
  }
}

const reorderButton = ref<HTMLElement | null>(null);
const longPressedHook = ref(false);
function onLongPressCallbackHook(e: PointerEvent) {
  longPressedHook.value = true;
  soundsStore.isReordering = true;
  soundsStore.reorderLocked = true;
}
onLongPress(reorderButton, onLongPressCallbackHook, {
  modifiers: {
    prevent: true,
  },
});

function reorderButtonClicked(longTouch = false) {
  soundsStore.isReordering = !soundsStore.isReordering;
  if (!soundsStore.isReordering) soundsStore.reorderLocked = false;
  //if (longTouch) soundsStore.reorderLocked = true;
  /* if (
    soundsStore.playlistSounds.length === 0 &&
    soundsStore.cartSounds0.length === 0 &&
    soundsStore.cartSounds1.length === 0
  )
    return;
  soundsStore.showReorderWindow = !soundsStore.showReorderWindow; */
}

function getReorderButtonClass() {
  if (soundsStore.reorderLocked) return 'alt-alt-icon';
  else if (soundsStore.isReordering) return 'alt-icon';
  else return 'icon';
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
  border-top: 2px solid orange;
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
.alt-icon {
  color: var(--blueColor);
  background-color: orange;
}
.alt-alt-icon {
  color: var(--blueColor);
  background-color: red;
}
</style>
