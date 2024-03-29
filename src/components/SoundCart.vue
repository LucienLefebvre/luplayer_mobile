<template>
  <div
    class="scrollable-cart"
    :style="{ height: scrollablePlaylistHeight + 'px' }"
  >
    <div class="cart-row">
      <div class="cart-column" ref="cartColumn">
        <TransitionGroup
          :name="!soundsStore.isReordering ? 'players' : 'no-transition'"
          id="listElements0"
          tag="div"
          style="max-width: 100%"
        >
          <div
            v-for="sound in soundsStore.cartSounds0"
            :key="sound.id"
            class="sound-player-column"
            :id="sound.id"
            style="max-width: 100%"
          >
            <SoundPlayer
              :sound="sound"
              :id="sound.id"
              :style="{ maxWidth: getPlayerColumnWidth() + 'px' }"
            />
          </div>
        </TransitionGroup>
      </div>
      <div class="cart-column">
        <TransitionGroup
          :name="!soundsStore.isReordering ? 'players' : 'no-transition'"
          id="listElements1"
          tag="div"
        >
          <div
            v-for="sound in soundsStore.cartSounds1"
            :key="sound.id"
            class="sound-player-column"
            :id="sound.id"
          >
            <SoundPlayer
              :sound="sound"
              :id="sound.id"
              :style="{ maxWidth: getPlayerColumnWidth() + 'px' }"
            />
          </div>
        </TransitionGroup>
      </div>
    </div>
    <AddSoundButton class="add-button" />
  </div>
</template>

<script setup lang="ts">
import Sortable from 'sortablejs';
import SoundPlayer from './SoundPlayer.vue';
import AddSoundButton from './AddSoundButton.vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { ref, onMounted, watch } from 'vue';
const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

onMounted(() => {
  updateHeight();
});

const scrollablePlaylistHeight = ref(0);
const updateHeight = () => {
  if (soundsStore.playerMode === 'playlistAndCart') {
    scrollablePlaylistHeight.value = settingsStore.playlistAndCartCartSize;
    return;
  }
  let heightToSubtract = 115;
  const meterHeight = 31;
  if (settingsStore.showPeakMeter) {
    heightToSubtract += meterHeight;
  }
  if (settingsStore.showLuMeter) {
    heightToSubtract += meterHeight;
  }
  scrollablePlaylistHeight.value = window.innerHeight - heightToSubtract;
};
watch(
  () => settingsStore.showPeakMeter,
  () => {
    updateHeight();
  }
);

watch(
  () => settingsStore.showLuMeter,
  () => {
    updateHeight();
  }
);

watch(
  () => settingsStore.playlistAndCartCartSize,
  () => {
    updateHeight();
  }
);
let elements0: HTMLElement | null = null;
let elements1: HTMLElement | null = null;
let sortable0: Sortable;
let sortable1: Sortable;

onMounted(() => {
  elements0 = document.getElementById('listElements0');
  elements1 = document.getElementById('listElements1');
  if (!elements0 || !elements1) return;

  sortable0 = Sortable.create(elements0!, {
    animation: 150,
    ghostClass: 'ghost',
    dragClass: 'dragging',
    group: { name: 'shared' },
    sort: true,
    onEnd: (evt) => {
      dragEnd(evt);
    },
  });
  sortable0.option('disabled', !soundsStore.isReordering);
  sortable1 = Sortable.create(elements1!, {
    animation: 150,
    ghostClass: 'ghost',
    dragClass: 'dragging',
    group: { name: 'shared' },
    sort: true,
    onEnd: (evt) => {
      dragEnd(evt);
    },
  });
  sortable1.option('disabled', !soundsStore.isReordering);
});

function dragEnd(evt: Sortable.SortableEvent) {
  const from = getCartFromDragEvent(evt.from);
  const to = getCartFromDragEvent(evt.to);
  const sound = from.find((s) => s.id === evt.item.id);
  if (!sound) return;
  const index = from.indexOf(sound);
  from.splice(index, 1);
  const toIndex = evt.newIndex ?? 0;
  to.splice(toIndex, 0, sound);

  if (soundsStore.reorderLocked) return;
  if (soundsStore.isReordering) {
    setTimeout(() => {
      soundsStore.isReordering = false;
    }, 50);
  }
}

function getCartFromDragEvent(element: HTMLElement) {
  if (element === elements0) {
    return soundsStore.cartSounds0;
  }
  return soundsStore.cartSounds1;
}

watch(
  () => soundsStore.isReordering,
  () => {
    sortable0.option('disabled', !soundsStore.isReordering);
    sortable1.option('disabled', !soundsStore.isReordering);
  }
);

const cartColumn = ref<HTMLElement | null>(null);
onMounted(() => {
  cartColumn.value = document.getElementById('cartColumn');
});

function getPlayerColumnWidth() {
  if (cartColumn.value === null) return 0;
  return cartColumn.value.clientWidth;
}
</script>

<style scoped>
@import 'src/css/players-transitions.css';

.scrollable-cart {
  overflow-y: auto;
  display: flex;
  flex-direction: row;
  width: 100%;
}
.cart-row {
  display: flex;
  flex-direction: row;
  width: 100%;
  max-width: 100%;
}
.cart-column {
  display: flex;
  flex-direction: column;
  width: 50%;
  max-width: 50%;
  padding-top: 2px;
  padding-bottom: 2px;
  margin-right: 2px;
}
.sound-player-column {
  padding-top: 2px;
  padding-bottom: 2px;
}
.add-button {
  bottom: 0;
  right: 0;
  margin: 10px;
  height: 50px;
}
</style>
