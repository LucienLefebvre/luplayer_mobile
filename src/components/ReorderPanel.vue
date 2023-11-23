<template>
  <div class="close-button">
    <q-btn
      @click="soundsStore.showReorderWindow = false"
      icon="close"
      color="white"
      flat
      round
      dense
      size="20px"
    />
  </div>
  <q-card class="panel-class">
    <div v-if="soundsStore.playerMode === 'playlist'">
      <draggable
        class="list-group"
        v-model="soundsStore.sounds[0]"
        item-key="id"
        @start="drag = true"
        @end="drag = false"
      >
        <template #item="{ element, index }">
          <div class="sound-list-item">
            <ReorderListElement :sound="element" :index="index" />
          </div>
        </template>
      </draggable>
    </div>
    <div v-else>
      <div class="row">
        <div
          v-for="(draggableObj, index) in draggables"
          :key="index"
          :style="{ width: draggableObj.width, height: 'inherit' }"
        >
          <draggable
            :list="draggableObj.list"
            style="height: 100%"
            group="sounds"
            item-key="name"
            @start="drag = true"
            @end="drag = false"
            ghost-class="ghost"
            drag-class="dragging"
          >
            <template #item="{ element }">
              <div class="q-px-xs q-py-xs">
                <ReorderListElement :sound="element" :index="index" />
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { useSoundsStore } from '../stores/sounds-store';
import draggable from 'vuedraggable';
import ReorderListElement from './ReorderListElement.vue';

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

function dragOptions() {
  return {
    animation: 200,
    group: 'description',
    disabled: false,
    ghostClass: 'ghost',
  };
}
</script>

<style scoped>
.panel-class {
  background-color: var(--bkgColor);
  color: white;
  padding: 10px;
  border-radius: 10px;
  overflow-y: auto;
  max-width: 100%;
}
.sound-list-item {
  padding-top: 5px;
  padding-bottom: 5px;
  font-size: 15px;
}
.close-button {
  display: flex;
  justify-content: center;
  align-items: center;
}
.list-group {
  min-height: 20px;
}
</style>
