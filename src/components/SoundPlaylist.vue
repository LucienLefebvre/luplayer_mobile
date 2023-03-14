<template>
  <div class="scrollable-playlist">
    <draggable
      :list="soundsStore.sounds[0]"
      :disabled="!soundsStore.isReordering"
      item-key="id"
      @start="drag = true"
      @end="dragEnd($event)"
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
  <q-dialog v-model="soundsStore.showEditWindow">
    <div class="column fit" style="align-items: center; width: 100%">
      <sound-details :sound="soundsStore.editedSound!" />
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { useSoundsStore } from '../stores/sounds-store';
import draggable from 'vuedraggable';
import SoundPlayer from './SoundPlayer.vue';
import SoundDetails from './SoundDetails.vue';

const soundsStore = useSoundsStore();
let drag = false;

function dragEnd(e: Event) {
  drag = false;
  e.preventDefault();
}
</script>

<style scoped>
.scrollable-playlist {
  height: calc(100vh - 215px);
  overflow-y: auto;
}
</style>
