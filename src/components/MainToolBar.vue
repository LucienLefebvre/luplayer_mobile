<template>
  <div class="toolbar">
    <q-toolbar class="bg-accent">
      <div style="display: flex; align-items: center">
        <img
          src="src\assets\icon.png"
          style="height: 30px; width: auto; object-fit: contain"
        />
      </div>
      <q-toolbar-title class="toolbar-title">LuPlayer </q-toolbar-title>
      <q-btn-dropdown
        flat
        :label="soundsStore.playerMode"
        class="q-mr-sm"
        style="color: orange"
        transition-duration="100"
      >
        <q-list style="background-color: var(--bkgColor)">
          <q-item
            clickable
            v-close-popup
            @click="playlistClicked()"
            :style="{
              'background-color':
                soundsStore.playerMode === 'playlist'
                  ? 'orange'
                  : 'var(--bkgColor)',
            }"
          >
            <q-item-section>
              <q-item-label class="listLabel">Playlist</q-item-label>
            </q-item-section>
          </q-item>
          <q-item
            clickable
            v-close-popup
            @click="cartClicked()"
            :style="{
              'background-color':
                soundsStore.playerMode === 'cart'
                  ? 'orange'
                  : 'var(--bkgColor)',
            }"
          >
            <q-item-section>
              <q-item-label class="listLabel">Cart</q-item-label>
            </q-item-section>
          </q-item>
          <q-item
            clickable
            v-close-popup
            @click="playlistAndCartClicked()"
            :style="{
              'background-color':
                soundsStore.playerMode === 'playlistAndCart'
                  ? 'orange'
                  : 'var(--bkgColor)',
            }"
          >
            <q-item-section>
              <q-item-label class="listLabel">Both</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>

      <!-- <q-btn
        class="q-mr-sm"
        flat
        round
        dense
        icon="settings"
        style="color: orange"
        @click="toggleSettings"
      /> -->
      <q-btn-dropdown
        flat
        round
        dense
        icon="settings"
        style="color: orange"
        transition-duration="100"
        ><settings-panel />
      </q-btn-dropdown>
    </q-toolbar>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSoundsStore } from '../stores/sounds-store';
import SettingsPanel from './SettingsPanel.vue';

const soundsStore = useSoundsStore();
const router = useRouter();

onMounted(() => {
  playlistClicked();
});
function cartClicked() {
  soundsStore.initializeCartMode();
}

function playlistClicked() {
  soundsStore.initializePlaylistMode();
}

function playlistAndCartClicked() {
  soundsStore.initializePlaylistAndCartMode();
}

function toggleSettings() {
  soundsStore.showSettingsWindow = !soundsStore.showSettingsWindow;
}
</script>

<style scoped>
.toolbar {
  border-bottom: 2px solid orange;
}
.listLabel {
  color: var(--blueColor);
  font-size: 17px;
}

.toolbar-title {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  color: var(--blueColor);
  font-size: 20px;
}
</style>
