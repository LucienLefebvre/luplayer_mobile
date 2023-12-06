<template>
  <q-layout view="hhh lpR fFf">
    <q-header>
      <MainToolBar />
    </q-header>
    <q-page-container class="gradient">
      <router-view />
    </q-page-container>
  </q-layout>
  <q-dialog v-model="soundsStore.showEditWindow" class="centered-dialog">
    <div class="column fit" style="align-items: center; width: 100%">
      <sound-details :sound="soundsStore.editedSound!" />
    </div>
  </q-dialog>
  <q-dialog v-model="soundsStore.showReorderWindow" class="centered-dialog">
    <div class="column fit" style="align-items: center; width: 100%">
      <ReorderPanel />
    </div>
  </q-dialog>
  <q-dialog v-model="soundsStore.showSettingsWindow" class="centered-dialog">
    <div class="column fit" style="align-items: center; width: 100%">
      <SettingsPanel />
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { useWakeLock } from '@vueuse/core';
import { onMounted, watch } from 'vue';
import { useSoundsStore } from 'src/stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';

import MainToolBar from 'src/components/MainToolBar.vue';
import SoundDetails from 'src/components/SoundDetails.vue';
import ReorderPanel from 'src/components/ReorderPanel.vue';
import SettingsPanel from 'src/components/SettingsPanel.vue';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();
const wakeLock = useWakeLock();
onMounted(() => {
  if (settingsStore.keepScreenAwake) wakeLock.request('screen');

  settingsStore.loadSettings();
});

watch(
  () => soundsStore.sounds[0].length,
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
}
</style>
<style scoped></style>
