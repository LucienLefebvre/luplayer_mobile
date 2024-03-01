<template>
  <q-layout view="hhh lpR fFf">
    <q-header>
      <MainToolBar />
    </q-header>
    <q-page-container class="gradient">
      <PlayerMainPanel />
    </q-page-container>
  </q-layout>
  <q-dialog v-model="soundsStore.showEditWindow" full-width position="bottom">
    <sound-details :key="soundDetailsKey" @remount="remountSoundDetails()" />
  </q-dialog>
  <q-dialog v-model="soundsStore.showReorderWindow" full-width>
    <div class="column fit centered-content">
      <ReorderPanel />
    </div>
  </q-dialog>
  <q-dialog v-model="soundsStore.showSettingsWindow" full-width>
    <SettingsDialog />
  </q-dialog>
  <q-dialog v-model="soundsStore.showDeleteSoundWindow">
    <div class="column fit centered-content">
      <DeleteSoundDialog :sound="soundsStore.selectedSound" />
    </div>
  </q-dialog>
  <q-dialog v-model="soundsStore.showPlaylistLoadSaveWindow">
    <div class="column fit centered-content">
      <div style="color: orange; font-size: 1rem">
        {{ soundsStore.playlistLoadSaveWindowText }}
      </div>
      <q-linear-progress
        :value="soundsStore.playlistLoadSaveProgress"
        color="orange"
        size="15px"
      />
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { useWakeLock } from '@vueuse/core';
import { onMounted, watch, ref } from 'vue';
import { useSoundsStore } from 'src/stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';

import MainToolBar from 'src/components/MainToolBar.vue';
import SoundDetails from 'src/components/SoundDetails.vue';
import ReorderPanel from 'src/components/ReorderPanel.vue';
import SettingsDialog from 'src/components/SettingsDialog.vue';
import DeleteSoundDialog from 'src/components/DeleteSoundDialog.vue';
import PlayerMainPanel from 'src/components/PlayerMainPanel.vue';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();
const wakeLock = useWakeLock();

onMounted(() => {
  if (settingsStore.keepScreenAwake) wakeLock.request('screen');

  settingsStore.loadSettings();

  if (process.env.NODE_ENV === 'production') {
    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
      e.returnValue = '';
    });
  }
});

watch(
  () => soundsStore.playlistSounds.length,
  (newValue) => {
    if (newValue === 0) {
      soundsStore.showReorderWindow = false;
    }
  }
);

watch(
  () => settingsStore.keepScreenAwake,
  (newValue) => {
    if (newValue === true) {
      wakeLock.request('screen');
      console.log('wakeLock.request');
    } else {
      console.log('wakeLock.release');
      wakeLock.release();
    }
  }
);

const soundDetailsKey = ref(0);
function remountSoundDetails() {
  soundDetailsKey.value += 1;
}
</script>

<style>
html {
  overflow: hidden;
  overscroll-behavior: none;
}
:root {
  --bkgColor: rgb(50, 62, 68);
  --blueColor: rgb(40, 134, 189);
}
body {
  background-color: rgb(50, 62, 68);
  font-family: 'Roboto', sans-serif;
}
.centered-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  transform: translateY(-25px);
}
</style>
<style scoped></style>
