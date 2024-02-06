<template>
  <div class="column" ref="panel">
    <div class="cart"><SoundCart /></div>
    <div
      class="separator"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    ></div>
    <div class="playlist"><SoundPlayList /></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import SoundPlayList from './SoundPlayList.vue';
import SoundCart from './SoundCart.vue';
import { useSettingsStore } from 'src/stores/settings-store';
const settings = useSettingsStore();

let touchMoveY = ref(0);

const panel = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);

const handleTouchStart = (event: TouchEvent) => {
  console.log('handleTouchStart');
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
