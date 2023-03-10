<template>
  <q-layout view="hhh lpR fff">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title style="color: orange"> LuPlayer web </q-toolbar-title>
        <q-btn
          label="reorder"
          @click="toggleReorder"
          :style="{ color: soundsStore.isReordering ? 'red' : 'white' }"
        />
      </q-toolbar>
    </q-header>
    <q-page-container>
      <q-page class="max-height">
        <div style="height: 5px"></div>
        <PeakMeter
          :analyserObject="soundsStore.outputAnalyserNodes"
          class="metersStyle"
        />
        <LuMeter
          :analyserNode="soundsStore.outputAnalyserNodes?.stereoAnalyser"
          class="metersStyle"
        />
        <div class="row fit full-height">
          <div
            class="d-flex flex-center"
            style="min-width: 85%; max-width: 85%"
          >
            <q-scroll-area @scroll="listScrolled" style="height: 600px">
              <draggable
                :list="soundsStore.sounds"
                :disabled="!soundsStore.isReordering"
                class="list-group"
                ghost-class="ghost"
                item-key="name"
                @start="drag = true"
                @end="drag = false"
              >
                <template #item="{ element }">
                  <div
                    class="q-px-xs q-py-xs"
                    v-touch-hold="(e: TouchHold) => touchHold(e, element)"
                    @click="(e: Event) => soundClicked(element)"
                    @dblclick="soundDoubleClicked(element)"
                    @touchend="soundTapped(element, $event)"
                  >
                    <SoundPlayer :sound="element" style="width: 100%" />
                  </div>
                </template>
              </draggable>
            </q-scroll-area>
          </div>
          <div class="rightPanel max-height">
            <PlaylistRightPanel style="height: 600px" />
          </div>
        </div>
      </q-page>
    </q-page-container>
    <q-footer elevated class="footerStyle">
      <PlaylistFooter />
    </q-footer>

    <q-dialog v-model="soundsStore.showEditWindow">
      <div class="column" style="align-items: center; width: 100%">
        <sound-details :sound="editedSound!" style="width: 100%" />
        <q-btn
          icon="close"
          color="white"
          size="100"
          flat
          round
          dense
          v-close-popup
        />
      </div>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { TouchHold } from 'quasar';
import draggable from 'vuedraggable';

import SoundPlayer from '../components/SoundPlayer.vue';
import PlaylistFooter from '../components/PlaylistFooter.vue';
import SoundDetails from './SoundDetails.vue';
import PlaylistRightPanel from './PlaylistRightPanel.vue';
import PeakMeter from './PeakMeter.vue';

import { SoundModel } from './models';
import LuMeter from './LuMeter.vue';

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
}
</style>
