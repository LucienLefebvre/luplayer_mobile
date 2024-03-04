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
        <div id="listElements">
          <div
            v-for="(player, index) in soundsStore.playlistSounds"
            :key="index"
            class="sound-item"
          >
            <ReorderListElement :sound="player" style="width: 100%" />
          </div>
        </div>
      </div>
      <div v-else>
        <div class="cart-sort">
          <div id="listElements1" class="sound-cart-item">
            <div
              v-for="(player, index) in soundsStore.cartSounds0"
              :key="index"
              class="sound-item"
            >
              <ReorderListElement :sound="player" style="width: 100%" />
            </div>
          </div>
          <div id="listElements2" class="sound-cart-item">
            <div
              v-for="(player, index) in soundsStore.cartSounds1"
              :key="index"
              class="sound-item"
            >
              <ReorderListElement :sound="player" style="width: 100%" />
            </div>
          </div>
        </div>
      </div>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { useSoundsStore } from '../stores/sounds-store';
import Sortable from 'sortablejs';
import ReorderListElement from './ReorderListElement.vue';
import { onMounted, ref, reactive } from 'vue';
import { SoundModel } from './models';

const soundsStore = reactive(useSoundsStore());

let elements: HTMLElement | null = null;
let elements1: HTMLElement | null = null;
let elements2: HTMLElement | null = null;
let sortable: Sortable;
let sortable1: Sortable;
let sortable2: Sortable;

onMounted(() => {
  elements = document.getElementById('listElements');
  elements1 = document.getElementById('listElements1');
  elements2 = document.getElementById('listElements2');
  if (!elements && soundsStore.playerMode === 'playlist') return;
  if (!elements1 && soundsStore.playerMode === 'cart') return;
  if (!elements2 && soundsStore.playerMode === 'cart') return;

  if (soundsStore.playerMode === 'playlist') {
    sortable = Sortable.create(elements!, {
      animation: 150,
      sort: true,
      ghostClass: 'ghost',
      dragClass: 'dragging',

      onEnd: (evt) => {
        const array = soundsStore.playlistSounds;

        const oldIndex = evt.oldIndex;
        const newIndex = evt.newIndex;

        if (oldIndex !== undefined && newIndex !== undefined) {
          const movedSound = array[oldIndex];
          array.splice(oldIndex, 1);
          array.splice(newIndex, 0, movedSound);
        }
      },
    });
  } else if (soundsStore.playerMode === 'cart') {
    sortable1 = Sortable.create(elements1!, {
      animation: 150,
      ghostClass: 'ghost',
      dragClass: 'dragging',
      group: { name: 'shared' },
      sort: true,
      onEnd: (evt) => {
        updateCartArrays(evt);
      },
    });

    sortable2 = Sortable.create(elements2!, {
      animation: 150,
      ghostClass: 'ghost',
      dragClass: 'dragging',
      group: { name: 'shared' },
      onEnd: (evt) => {
        updateCartArrays(evt);
      },
    });
  }
});

let forceUpdate = 0;
function updateCartArrays(evt: Sortable.SortableEvent) {
  const oldArrayIndex = evt.from.id === 'listElements1' ? 0 : 1;
  const newArrayIndex = evt.to.id === 'listElements1' ? 0 : 1;
  const oldItemIndex = evt.oldIndex;
  const newItemIndex = evt.newIndex;

  if (
    oldItemIndex !== undefined &&
    newItemIndex !== undefined &&
    oldArrayIndex !== undefined &&
    newArrayIndex !== undefined
  ) {
    const oldArray =
      evt.from.id === 'listElements1'
        ? soundsStore.cartSounds0
        : soundsStore.cartSounds1;
    const newArray =
      evt.to.id === 'listElements1'
        ? soundsStore.cartSounds0
        : soundsStore.cartSounds1;

    if (oldArray && newArray) {
      const movedItem = oldArray[oldItemIndex];
      oldArray.splice(oldItemIndex, 1);
      newArray.splice(newItemIndex, 0, movedItem);
    }
  }
  elements1 = document.getElementById('listElements1');
  elements2 = document.getElementById('listElements2');
  sortable1.el = elements1!;
  sortable2.el = elements2!;
}
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
  max-height: 80vh;
}

.sound-item {
  display: flex;
  flex-direction: row;
  padding-top: 5px;
  padding-bottom: 5px;
  font-size: 15px;
  width: 100%;
}
.sound-cart-item {
  display: flex;
  flex-direction: column;
  padding: 3px;
  font-size: 15px;
  width: 50%;
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
.cart-sort {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
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
