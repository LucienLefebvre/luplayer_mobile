<template>
  <div
    ref="touchZone"
    class="touch-zone"
    @touchmove.prevent
    :style="{ borderColor: getColor() }"
  ></div>
</template>

<script setup lang="ts">
import { ref, PropType, onMounted, watch } from 'vue';
import type { SwipeDirection } from '@vueuse/core';
import { useSwipe } from '@vueuse/core';
import Konva from 'konva';

import * as constants from 'src/scripts/constants.ts';
import { SoundModel } from './models';
import { useSettingsStore } from 'src/stores/settings-store';
import {
  setSelectedSound,
  setSoundVolumeDB,
  getRemainingTime,
} from 'src/scripts/sound-controller';
import { logScaleTo0to1 } from 'src/scripts/math-helpers';
import { is } from 'quasar';

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
let tween: Konva.Tween;

let timeOfLastClick = 0;

function clicked() {
  if (Date.now() - timeOfLastClick < constants.DOUBLE_CLICK_DELAY) {
    doubleClicked();
  }
  timeOfLastClick = Date.now();
}

function doubleClicked() {
  setSoundVolumeDB(sound.value, 0);
  updateRectWithAnim(0, 0.25);
}

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

  registerEventListeners();
});

function registerEventListeners() {
  if (touchZone.value) {
    touchZone.value.addEventListener('touchstart', touchStart);
    touchZone.value.addEventListener('mousedown', touchStart);
    touchZone.value.addEventListener('touchmove', touchMove);
    touchZone.value.addEventListener('mousemove', touchMove);
    touchZone.value.addEventListener('touchend', touchEnd);
    touchZone.value.addEventListener('mouseup', touchEnd);
  }
}

let isSwiping = ref(false);
let touchStartY = 0;
const touchStart = (e: TouchEvent | MouseEvent) => {
  touchStartY = e instanceof TouchEvent ? e.touches[0].clientY : e.clientY;
  clicked();
  swipeStartGain = sound.value.volumeDb;
  sound.value.shouldShowVolume = true;
  setSelectedSound(sound.value, false);
};

const touchMove = (e: TouchEvent | MouseEvent) => {
  isSwiping.value = true;
  clearTimeout(timeOut);

  let lengthY =
    e instanceof TouchEvent ? touchStartY - e.touches[0].clientY : 0;
  let gain =
    swipeStartGain +
    (lengthY / constants.CART_VOLUME_SWIPE_DIVIDER) *
      settingsStore.cartVolumeSwipeMultiplier;
  gain = Math.round(Math.min(12, Math.max(-60, gain)) * 10) / 10;

  if (gain !== sound.value.volumeDb) setSoundVolumeDB(sound.value, gain);
  if (shouldUpdateRect) updateRect();
};

const touchEnd = (e: TouchEvent | MouseEvent) => {
  launchTimeout();
  isSwiping.value = false;
};

watch(
  () => sound.value.volumeDb,
  () => {
    if (!isSwiping.value) updateRectWithAnim(sound.value.volumeDb, 0.25);
  }
);

/* const { direction, isSwiping, lengthX, lengthY } = useSwipe(touchZone, {
  threshold: 2,
  onSwipeStart(e: TouchEvent) {
    clicked();
    swipeStartGain = sound.value.volumeDb;
    sound.value.shouldShowVolume = true;
    setSelectedSound(sound.value, false);
  },
  onSwipe(e: TouchEvent) {
    clearTimeout(timeOut);
    let gain =
      swipeStartGain +
      (lengthY.value / constants.CART_VOLUME_SWIPE_DIVIDER) *
        settingsStore.cartVolumeSwipeMultiplier;
    gain = Math.min(12, Math.max(-60, gain));
    setSoundVolumeDB(sound.value, gain);

    if (shouldUpdateRect) updateRect();
  },
  onSwipeEnd(e: TouchEvent, direction: SwipeDirection) {
    launchTimeout();
  },
}); */

function updateRect() {
  rect.height(getRectHeight());
  rect.y(stage.height() - getRectHeight());
}

let shouldUpdateRect = true;
function updateRectWithAnim(value: number, animDuration: number) {
  shouldUpdateRect = false;
  tween = new Konva.Tween({
    node: rect,
    duration: animDuration,
    y: stage.height() - getRectHeightOfValue(value),
    height: getRectHeightOfValue(value),
    onFinish: () => {
      console.log('finished');
      shouldUpdateRect = true;
    },
  }).play();
}

function getRectHeight() {
  return Math.floor(
    logScaleTo0to1(sound.value.volumeDb, -60, 12, 5) * stage.height()
  );
}

function getRectHeightOfValue(value: number) {
  return Math.floor(logScaleTo0to1(value, -60, 12, 5) * stage.height());
}

function launchTimeout() {
  timeOut = setTimeout(() => {
    sound.value.shouldShowVolume = false;
  }, 1000);
}

function getColor(): string {
  let color = 'orange';
  if (sound.value.isPlaying) {
    if (getRemainingTime(sound.value) < 5 && sound.value.isPlaying)
      color = 'red';
    else color = 'green';
  } else {
    ('orange');
  }
  if (rect && rect.fill() !== color) rect.fill(color);

  return color;
}

const observer = new ResizeObserver(() => {
  if (!stage || !touchZone.value) return;
  stage.width(touchZone.value.clientWidth);
  stage.height(touchZone.value.clientHeight);
  rect.width(touchZone.value.clientWidth);
  updateRect();
});

onMounted(() => {
  observer.observe(touchZone.value!);
});
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
