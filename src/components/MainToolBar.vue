<template>
  <div class="toolbar">
    <q-toolbar class="bg-accent q-pa-xs">
      <q-btn
        class="q-mr-sm"
        flat
        round
        dense
        icon="menu"
        style="color: var(--orangeColor)"
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
        :label="soundsStore.appMode"
        style="color: var(--orangeColor)"
        transition-duration="100"
      >
        <q-list style="background-color: var(--bkgColor)">
          <q-item
            clickable
            v-close-popup
            @click="recorderClicked()"
            :style="{
              'background-color':
                soundsStore.appMode === 'recorder'
                  ? 'var(--orangeColor)'
                  : 'var(--bkgColor)',
            }"
          >
            <q-item-section>
              <q-item-label class="listLabel">Recorder</q-item-label>
            </q-item-section>
          </q-item>
          <q-item
            clickable
            v-close-popup
            @click="playlistClicked()"
            :style="{
              'background-color':
                soundsStore.appMode === 'playlist'
                  ? 'var(--orangeColor)'
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
                soundsStore.appMode === 'cart'
                  ? 'var(--orangeColor)'
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

function recorderClicked() {
  settingsStore.lastUsedPlayerMode = 'recorder';
  settingsStore.saveSettings();

  soundsStore.initializeRecorderMode();
}

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
  border-bottom: 2px solid var(--orangeColor);
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
