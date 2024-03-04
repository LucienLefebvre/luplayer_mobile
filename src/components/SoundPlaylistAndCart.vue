<template>
  <q-splitter
    v-model="splitterModel"
    horizontal
    :style="{ height: scrollablePlaylistHeight + 'px' }"
  >
    <template v-slot:before>
      <div class="cart" ref="cartRef"><SoundCart /></div>
    </template>
    <template v-slot:after>
      <div class="playlist"><SoundPlayList /></div>
    </template>
  </q-splitter>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import SoundPlayList from './SoundPlayList.vue';
import SoundCart from './SoundCart.vue';
import { useSettingsStore } from 'src/stores/settings-store';
import { useSoundsStore } from 'src/stores/sounds-store';
const settings = useSettingsStore();
const soundsStore = useSoundsStore();

let touchMoveY = ref(0);

onMounted(() => {
  updateHeight();
  window.addEventListener('resize', updateHeight);
});

const splitterModel = ref(50);
const scrollablePlaylistHeight = ref(0);
const cartRef = ref<HTMLDivElement | null>(null);
const updateHeight = () => {
  let heightToSubtract = 205;
  const meterHeight = 31;
  if (settings.showPeakMeter) {
    heightToSubtract += meterHeight;
  }
  if (settings.showLuMeter) {
    heightToSubtract += meterHeight;
  }
  if (soundsStore.playerMode === 'playlistAndCart') {
    heightToSubtract += cartRef.value?.clientHeight || 0;
  }
  scrollablePlaylistHeight.value = window.innerHeight - heightToSubtract;
};

const panel = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);

const handleTouchStart = (event: TouchEvent) => {
  if (!panel.value) return;

  const panelRect = panel.value.getBoundingClientRect();
  const yPos = event.touches[0].clientY;
  if (yPos > panelRect.top && yPos < panelRect.bottom) {
    isDragging.value = true;
  }
};

const handleTouchMove = (event: TouchEvent) => {
  if (!panel.value) return;
  if (isDragging.value === false) return;

  const panelRect = panel.value.getBoundingClientRect();
  touchMoveY.value = event.touches[0].clientY;
  const yPos = touchMoveY.value - panelRect.top;

  settings.playlistAndCartCartSize = Math.max(0, yPos);
};

const handleTouchEnd = (event: TouchEvent) => {
  isDragging.value = false;
  useSettingsStore().saveSettings();
};
</script>

<style scoped>
.separator {
  margin-left: 10px;
  height: 5px;
  border-radius: 5px;
  background: orange;
  opacity: 0.8;
  touch-action: none;
}

.cart {
  max-width: 100%;
}
</style>
