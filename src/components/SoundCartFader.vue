<template>
  <div ref="touchZone" class="touch-zone" @touchmove.prevent></div>
</template>

<script setup lang="ts">
import { ref, PropType, onMounted } from 'vue';
import { useSwipe } from '@vueuse/core';
import type { SwipeDirection } from '@vueuse/core';
import Konva from 'konva';

import { SoundModel } from './models';
import { useSettingsStore } from 'src/stores/settings-store';
import {
  setSelectedSound,
  setSoundVolumeDB,
} from 'src/scripts/sound-controller';
import { logScaleTo0to1 } from 'src/scripts/math-helpers';

const settingsStore = useSettingsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});
const sound = ref(props.sound);
const touchZone = ref<HTMLDivElement | null>(null);

let swipeStartGain = sound.value.volumeDb;
let timeOut: ReturnType<typeof setTimeout>;

let stage: Konva.Stage;
let rect: Konva.Rect;

onMounted(() => {
  if (!touchZone.value) return;
  stage = new Konva.Stage({
    container: touchZone.value,
    width: touchZone.value?.clientWidth ?? 0,
    height: touchZone.value?.clientHeight ?? 0,
  });

  const layer = new Konva.Layer();

  rect = new Konva.Rect({
    width: touchZone.value.clientWidth,
    height: touchZone.value.clientHeight,
    fill: 'orange',
  });

  const bkgRect = new Konva.Rect({
    width: touchZone.value.clientWidth,
    height: touchZone.value.clientHeight,
    fill: 'rgba(255,165,0,0.1)',
  });

  layer.add(bkgRect);
  layer.add(rect);
  stage.add(layer);

  updateRect();
});

const { direction, isSwiping, lengthX, lengthY } = useSwipe(touchZone, {
  threshold: 5,
  passive: true,
  onSwipeStart(e: TouchEvent) {
    swipeStartGain = sound.value.volumeDb;
    sound.value.shouldShowVolume = true;
    setSelectedSound(sound.value, false);
    launchTimeout();
  },
  onSwipe(e: TouchEvent) {
    clearTimeout(timeOut);
    if (direction.value === 'UP' || direction.value === 'DOWN') {
      let gain =
        swipeStartGain +
        (lengthY.value / 20) * settingsStore.cartVolumeSwipeMultiplier;
      gain = Math.min(12, Math.max(-60, gain));
      setSoundVolumeDB(sound.value, gain);

      updateRect();
    }
  },
  onSwipeEnd(e: TouchEvent, direction: SwipeDirection) {
    launchTimeout();
  },
});

function updateRect() {
  const rectHeight =
    logScaleTo0to1(sound.value.volumeDb, -60, 12, 5) * stage.height();
  const rectYStart = stage.height() - rectHeight;
  rect.height(rectHeight);
  rect.y(rectYStart);
}

function launchTimeout() {
  timeOut = setTimeout(() => {
    sound.value.shouldShowVolume = false;
  }, 1000);
}
</script>

<style scoped>
.touch-zone {
  width: 100%;
  height: 100%;

  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  overflow: hidden;
  border: 2px solid rgb(255, 166, 0);
  box-shadow: 2px 2px 7px 3px rgba(0, 0, 0, 0.3);
}
</style>
