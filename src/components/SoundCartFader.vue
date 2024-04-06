<template>
  <div class="touch-zone" :style="{ borderColor: getColor() }">
    <div class="konva-stage" ref="touchZone" @touchmove.prevent></div>
    <div ref="clickInterceptor" class="click-interceptor"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, PropType, onMounted, watch } from 'vue';
import Konva from 'konva';

import * as constants from 'src/scripts/constants';
import { SoundModel } from './models';
import { useSettingsStore } from 'src/stores/settings-store';
import {
  setSelectedSound,
  setSoundVolumeDB,
  getRemainingTime,
} from 'src/scripts/sound-controller';
import { scaleTo0to1 } from 'src/scripts/math-helpers';

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

const clickInterceptor = ref<HTMLDivElement | null>(null);
function registerEventListeners() {
  if (clickInterceptor.value) {
    clickInterceptor.value.addEventListener('touchstart', touchStart);
    clickInterceptor.value.addEventListener('mousedown', touchStart);
    clickInterceptor.value.addEventListener('touchmove', touchMove);
    clickInterceptor.value.addEventListener('mousemove', touchMove);
    clickInterceptor.value.addEventListener('touchend', touchEnd);
    clickInterceptor.value.addEventListener('mouseup', touchEnd);
  }
}

let isSwiping = ref(false);
let touchStartY = 0;
function getTouch(e: TouchEvent) {
  for (let i = 0; i < e.touches.length; i++) {
    if (e.touches[i].target === clickInterceptor.value) {
      return e.touches[i];
    }
  }
  return null;
}
const touchStart = (e: TouchEvent | MouseEvent) => {
  let touch;
  if (e instanceof TouchEvent) {
    touch = getTouch(e);
  }
  if (!touch) return;

  touchStartY = e instanceof TouchEvent ? touch.clientY : e.clientY;
  clicked();
  swipeStartGain = sound.value.volumeDb;
  sound.value.shouldShowVolume = true;
  setSelectedSound(sound.value, false);
};

const touchMove = (e: TouchEvent | MouseEvent) => {
  console.log('🚀 ~ touchMove ~ e', e);
  isSwiping.value = true;
  clearTimeout(timeOut);

  let touch;
  if (e instanceof TouchEvent) {
    touch = getTouch(e);
  }
  if (!touch) return;

  let lengthY = e instanceof TouchEvent ? touchStartY - touch.clientY : 0;
  console.log('🚀 ~ touchMove ~ lengthY:', lengthY);

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

defineExpose({
  touchStart,
  touchMove,
  touchEnd,
});

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
    scaleTo0to1(sound.value.volumeDb, -60, 12) * stage.height()
  );
}

function getRectHeightOfValue(value: number) {
  return Math.floor(scaleTo0to1(value, -60, 12) * stage.height());
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
  position: relative;
}
.konva-stage {
  width: 100%;
  height: 100%;
}

.click-interceptor {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1;
  background-color: transparent;
  color: transparent;
}
</style>
