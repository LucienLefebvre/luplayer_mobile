<template>
  <q-layout view="hhh lpR fff">
    <q-page-container>
      <q-page>
        <PeakMeter
          :analyserObject="soundsStore.outputAnalyserNodes"
          class="metersStyle"
        />
        <LuMeter
          :analyserNode="soundsStore.outputAnalyserNodes?.stereoAnalyser"
          class="metersStyle"
        />
        <div class="fit" style="min-height: inherit">
          <div class="row playlist-height">
            <div
              class="column"
              style="
                min-width: 85%;
                max-width: 85%;
                min-height: inherit;
                align-items: stretch;
              "
            >
              <SoundPlayList />
            </div>
            <div class="rightPanel">
              <PlaylistRightPanel class="playlist-height" />
            </div>
          </div>
        </div>
      </q-page>
    </q-page-container>
    <q-footer elevated class="footerStyle">
      <PlaylistFooter />
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { TouchHold } from 'quasar';

import PlaylistFooter from './PlaylistFooter.vue';

import PlaylistRightPanel from './PlaylistRightPanel.vue';
import PeakMeter from './PeakMeter.vue';
import LuMeter from './LuMeter.vue';
import { SoundModel } from './models';

import SoundPlayList from './SoundPlayList.vue';

let drag = false;
let scrolled = false;
const soundsStore = useSoundsStore();

function listScrolled() {
  scrolled = true;
}
function soundTapped(soundModel: SoundModel, e: TouchEvent) {
  e.preventDefault();
  if (!soundsStore.isReordering && !scrolled) {
    soundsStore.setSelectedSound(soundModel);
  }
  scrolled = false;
}

function soundClicked(sound: SoundModel) {
  if (!soundsStore.isReordering) {
    soundsStore.setSelectedSound(sound);
  }
}
function soundDoubleClicked(sound: SoundModel) {
  editedSound.value = sound;
  soundsStore.showEditWindow = true;
}

function toggleReorder() {
  soundsStore.isReordering = !soundsStore.isReordering;
}

const editedSound = ref<SoundModel | null>(null);

function touchHold(e: TouchHold, sound: SoundModel) {
  editedSound.value = sound;
  soundsStore.showEditWindow = true;
}
</script>

<style>
.main {
  height: 100%;
  min-height: 100%;
}
.playlist-height {
  min-height: calc(100vh - 220px);
}
.rightPanel {
  width: 15%;
  justify-content: center;
  align-items: center;
}
.sound-item {
  cursor: pointer;
}

.footerStyle {
  background-color: var(--bkgColor);
}
.drawerStyle {
  background-color: var(--bkgColor);
}
.metersStyle {
  height: 30px;
  width: 100%;
  padding-left: 5px;
  padding-right: 5px;
  padding-top: 2px;
}
.ghost {
  opacity: 0.5;
}
</style>
