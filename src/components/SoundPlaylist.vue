<template>
  <q-scroll-area @scroll="listScrolled" class="playlist-height">
    <draggable
      :list="soundsStore.sounds[0]"
      :disabled="!soundsStore.isReordering"
      item-key="id"
      @start="drag = true"
      @end="drag = false"
      ghost-class="ghost"
      drag-class="dragging"
    >
      <template #item="{ element }">
        <div class="q-px-xs q-py-xs">
          <SoundPlayer :sound="element" />
        </div>
      </template>
    </draggable>
  </q-scroll-area>
  <q-dialog v-model="soundsStore.showEditWindow">
    <div class="column fit" style="align-items: center; width: 100%">
      <sound-details :sound="soundsStore.editedSound!" />
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { route } from 'quasar/wrappers';
import { ref } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { TouchHold } from 'quasar';
import draggable from 'vuedraggable';

import SoundPlayer from './SoundPlayer.vue';
import SoundDetails from './SoundDetails.vue';
import { SoundModel } from './models';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const soundsStore = useSoundsStore();
let drag = false;
let scrolled = false;

function listScrolled() {
  scrolled = true;
}

function soundTapped(soundModel: SoundModel, e: TouchEvent) {
  if (!soundsStore.isReordering && !scrolled) {
    soundsStore.setSelectedSound(soundModel);
  }
  scrolled = false;
  soundOffset.value = 0;
}

function soundClicked(sound: SoundModel) {
  if (!soundsStore.isReordering) {
    soundsStore.setSelectedSound(sound);
  }
}
function soundDoubleClicked(sound: SoundModel) {
  showEditWindow(sound);
}

function touchHold(e: TouchHold, sound: SoundModel) {
  showEditWindow(sound);
}

function showEditWindow(sound: SoundModel) {
  soundsStore.editedSound = sound;
  soundsStore.showEditWindow = true;
}

function handleSwipe(evt: Event) {
  console.log('swipe', evt);
}

const soundOffset = ref(0);
function moveSound(e: any, sound: SoundModel) {
  soundOffset.value = e.offset.x;
  console.log('moveSound', soundOffset);
}
</script>

<style scoped>
.dragging {
  transform: translate(0px, -120px);
}
</style>
