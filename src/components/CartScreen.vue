<template>
  <MetersPanel />
  <div class="row flex">
    <div style="width: 50%; height: inherit">
      <draggable
        :list="soundsStore.sounds[0]"
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
    <div style="width: 50%">
      <draggable
        style="height: 100%"
        :list="soundsStore.sounds[1]"
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
</template>

<script setup lang="ts">
import draggable from 'vuedraggable';
import SoundPlayer from './SoundPlayer.vue';
import { useSoundsStore } from '../stores/sounds-store';
import MetersPanel from './MetersPanel.vue';
const soundsStore = useSoundsStore();

let drag = false;
</script>

<style scoped></style>
