<template>
  <div class="reorder-panel">
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
          handle=".handle"
        >
          <template #item="{ element, index }">
            <div class="sound-list-item">
              <div class="handle">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
              </div>
              <ReorderListElement
                :sound="element"
                :index="index"
                class="element"
              />
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
              handle=".handle"
            >
              <template #item="{ element }">
                <div class="sound-list-item">
                  <div class="handle">
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                  </div>
                  <ReorderListElement :sound="element" :index="index" />
                </div>
              </template>
            </draggable>
          </div>
        </div>
      </div>
    </q-card>
  </div>
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
</script>

<style scoped>
.reorder-panel {
  display: flex;
  flex-direction: column;
  max-height: 100%;
}
.panel-class {
  background-color: var(--bkgColor);
  padding: 10px;
  border-radius: 10px;
  max-width: 100%;
  width: 85vw;
}

.sound-list-item {
  display: flex;
  flex-direction: row;
  padding-top: 5px;
  padding-bottom: 5px;
  font-size: 15px;
  max-width: 100%;
}
.close-button {
  display: flex;
  justify-content: center;
  align-items: center;
}
.list-group {
  min-height: 20px;
  max-height: 80%;
}
.handle {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  margin-right: 5px;
  width: 15px;
  height: 45px;
  border-radius: 7px;

  opacity: 0.5;
}
.bar {
  width: 2px;
  height: 100%;
  background: rgb(229, 149, 0);
}
.element {
  width: 94%;
}
</style>
