<template>
  <div class="toolbar">
    <q-toolbar class="bg-accent q-pa-xs">
      <q-btn
        class="q-mr-sm"
        flat
        round
        dense
        icon="menu"
        style="color: orange"
        @click="toggleSettings"
      />
      <div style="display: flex; align-items: center">
        <img
          src="~assets\icon.png"
          style="height: 30px; width: auto; object-fit: contain"
        />
      </div>

      <q-toolbar-title class="toolbar-title">LuPlayer </q-toolbar-title>
      <main-tool-bar-busy-round />
      <q-btn-dropdown
        flat
        :label="soundsStore.playerMode"
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
        </q-list>
      </q-btn-dropdown>
    </q-toolbar>
  </div>
</template>

<script setup lang="ts">
import MainToolBarBusyRound from './MainToolBarBusyRound.vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

function cartClicked() {
  soundsStore.initializeCartMode();
  settingsStore.lastUsedPlayerMode = 'cart';
  settingsStore.saveSettings();
}

function playlistClicked() {
  soundsStore.initializePlaylistMode();
  settingsStore.lastUsedPlayerMode = 'playlist';
  settingsStore.saveSettings();
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
  font-size: 1rem;
  font-family: 'Roboto', sans-serif;
}

.toolbar-title {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  color: var(--blueColor);
  font-size: 1.5rem;
}
</style>
