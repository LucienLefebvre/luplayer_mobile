<template>
  <div
    class="scrollable-cart"
    :style="{ height: scrollablePlaylistHeight + 'px' }"
  >
    <div class="cart-row">
      <div class="cart-column">
        <div id="listElements0">
          <div
            v-for="sound in soundsStore.cartSounds0"
            :key="sound.id"
            class="sound-player-column"
            :id="sound.id"
          >
            <SoundPlayer :sound="sound" :id="sound.id" />
          </div>
        </div>
      </div>
      <div class="cart-column">
        <div id="listElements1">
          <div
            v-for="sound in soundsStore.cartSounds1"
            :key="sound.id"
            class="sound-player-column"
            :id="sound.id"
          >
            <SoundPlayer :sound="sound" :id="sound.id" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sortable from 'sortablejs';
import SoundPlayer from './SoundPlayer.vue';
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
  console.log('heightToSubtract', heightToSubtract);
  console.log('window.innerHeight', window.innerHeight);
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
      dragEnd();
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
      dragEnd();
    },
  });
  sortable1.option('disabled', !soundsStore.isReordering);
});

function dragEnd() {
  if (soundsStore.reorderLocked) return;
  if (soundsStore.isReordering) {
    soundsStore.isReordering = false;
  }
}
watch(
  () => soundsStore.isReordering,
  () => {
    sortable0.option('disabled', !soundsStore.isReordering);
    sortable1.option('disabled', !soundsStore.isReordering);
  }
);
</script>

<style scoped>
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
}
.cart-column {
  display: flex;
  flex-direction: column;
  width: 50%;
  padding: 2px;
}
.sound-player-column {
  padding: 2px;
}
</style>
