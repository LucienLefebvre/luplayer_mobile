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
    <div>
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
  </q-card>
</template>

<script setup lang="ts">
import { useSoundsStore } from '../stores/sounds-store';
import draggable from 'vuedraggable';
import ReorderListElement from './ReorderListElement.vue';

const soundsStore = useSoundsStore();
let drag = false;

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
