<template>
  <div v-if="isCapacitor()"></div>
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
  <q-dialog v-model="settingsStore.showWelcomeDialog">
    <WelcomeDialog />
  </q-dialog>
  <q-dialog v-model="soundsStore.showPlaylistLoadSaveWindow">
    <div class="column fit centered-content">
      <div style="color: orange; font-size: 1rem">
        {{ soundsStore.playlistLoadSaveWindowText }}
      </div>
      <q-linear-progress
        instant-feedback
        :value="soundsStore.playlistLoadSaveProgress"
        color="orange"
        size="18px"
      >
        <div class="absolute-full flex flex-center">
          <q-badge
            color="transparent"
            text-color="white"
            :label="
              (soundsStore.playlistLoadSaveProgress * 100).toFixed(0) + '%'
            "
          />
        </div>
      </q-linear-progress>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { useWakeLock } from '@vueuse/core';
import { onMounted, watch, ref } from 'vue';
import { useSoundsStore } from 'src/stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

import MainToolBar from 'src/components/MainToolBar.vue';
import WelcomeDialog from 'src/components/WelcomeDialog.vue';
import SoundDetails from 'src/components/SoundDetails.vue';
import ReorderPanel from 'src/components/ReorderPanel.vue';
import SettingsDialog from 'src/components/SettingsDialog.vue';
import DeleteSoundDialog from 'src/components/DeleteSoundDialog.vue';
import PlayerMainPanel from 'src/components/PlayerMainPanel.vue';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();
const wakeLock = useWakeLock();

onMounted(() => {
  if (settingsStore.keepScreenAwake) keepAwake();

  settingsStore.loadSettings();

  if (settingsStore.shouldShowWelcomeDialogNextTime) {
    settingsStore.showWelcomeDialog = true;
  }

  switch (settingsStore.lastUsedPlayerMode) {
    case 'playlist':
      soundsStore.initializePlaylistMode();
      break;
    case 'cart':
      soundsStore.initializeCartMode();
      break;
  }

  if (process.env.NODE_ENV === 'production') {
    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
      e.returnValue = '';
    });
  }

  if (!isCapacitor()) {
    let script = document.createElement('script');
    script.setAttribute('async', '');
    script.setAttribute('data-id', '101443804');
    script.src = '//static.getclicky.com/js';
    document.body.appendChild(script);
  }
});

watch(
  () => settingsStore.keepScreenAwake,
  (newValue) => {
    if (newValue === true) {
      keepAwake();
    } else {
      allowSleep();
    }
  }
);

function keepAwake() {
  if (isCapacitor()) {
    KeepAwake.keepAwake();
  } else {
    wakeLock.request('screen');
  }
}

function allowSleep() {
  if (isCapacitor()) {
    KeepAwake.allowSleep();
  } else {
    wakeLock.release();
  }
}

function isCapacitor() {
  return Capacitor.isNativePlatform();
}
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
  --orangeColor: orange;
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
