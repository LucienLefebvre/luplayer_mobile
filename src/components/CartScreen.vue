<template>
  <MetersPanel />
  <div class="scrollable-cart">
    <div class="row">
      <div
        v-for="(draggableObj, index) in draggables"
        :key="index"
        :style="{ width: draggableObj.width, height: 'inherit' }"
      >
        <draggable
          :list="draggableObj.list"
          style="height: 100%"
          :disabled="!soundsStore.isReordering"
          group="sounds"
          item-key="name"
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
      </div>
    </div>
  </div>
  <q-page-sticky position="bottom-right" :offset="[18, 18]">
    <AddSoundButton />
  </q-page-sticky>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable';
import SoundPlayer from './SoundPlayer.vue';
import { useSoundsStore } from '../stores/sounds-store';
import MetersPanel from './MetersPanel.vue';
import AddSoundButton from './AddSoundButton.vue';
const soundsStore = useSoundsStore();

let drag = false;

const draggables = [
  {
    width: '50%',
    list: soundsStore.sounds[0],
  },
  {
    width: '50%',
    list: soundsStore.sounds[1],
  },
];

let scrolled = false;

function listScrolled() {
  scrolled = true;
}
</script>

<style scoped>
.scrollable-cart {
  height: calc(100vh - 130px);
  overflow-y: auto;
}
.ghost {
  background-color: red;
}
.dragging {
}
</style>
