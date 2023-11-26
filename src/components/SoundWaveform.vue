<template>
  <div style="position: relative">
    <div ref="waveformView" @wheel="handleMouseWheel"></div>
  </div>
</template>

<script setup lang="ts">
import { PropType, ref, onMounted, watch } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from '../stores/settings-store';
import { SoundModel, WaveformParams } from './models';
import {
  calculateYValueArrayFromChunks,
  drawWaveform,
} from 'src/composables/waveform-display';
import Konva from 'konva';
import { debounce } from 'quasar';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
  isSoundDetails: { type: Boolean, required: false, default: false },
});

const sound = ref(props.sound);
let resizeObserver = null as ResizeObserver | null;
const waveformView = ref<HTMLDivElement | null>(null);
let waveformChunks = null as Float32Array | null;
let stage = null as Konva.Stage | null;

let waveformParams = null as WaveformParams | null;
const zoomFactor = ref(1);

onMounted(() => {
  if (!waveformView.value) return;

  resizeObserver = new ResizeObserver(() => {
    handleResized();
  });
  resizeObserver.observe(waveformView.value);

  const containerWidth = waveformView.value.clientWidth;
  const containerHeight =
    settingsStore.playerHeightFactor >= 0
      ? 100 * settingsStore.playerHeightFactor
      : 10;
  stage = new Konva.Stage({
    container: waveformView.value,
    width: containerWidth,
    height: containerHeight,
  });

  waveformChunks = new Float32Array(stage.width());
  const layer = new Konva.Layer();
  stage.add(layer);

  waveformParams = {
    waveformChunks: waveformChunks,
    sound: props.sound,
    stage: stage,
    layer: layer,
    verticalZoomFactor: settingsStore.waveformVerticalZoomFactor,
    startTime: 0,
    endTime: props.sound.duration,
  };

  const anim = new Konva.Animation(function () {
    if (waveformChunks === null) return;
    drawWaveform(waveformParams!);
  }, layer);

  anim.start();

  registerMouseEvents();
});

const handleResized = debounce(() => {
  if (!waveformView.value) return;
  if (stage === null) return;

  stage.width(waveformView.value.clientWidth);

  updateWaveform();
}, 100);

function updateWaveform() {
  if (props.sound.waveform === null) return;
  if (waveformParams === null) return;
  calculateYValueArrayFromChunks(
    props.sound.waveform,
    waveformView.value?.clientWidth ?? 0,
    waveformParams.startTime,
    waveformParams.endTime,
    sound.value
  ).then((array) => {
    if (waveformParams === null) return;
    waveformParams.waveformChunks = array;
    sound.value.waveformShouldBeRedrawn = true;
  });
}

let isDragging = false;
let dragStartX = 0;
let waveformDragStartTime = 0;
let waveformDragEndTime = 0;
let initialTouchDistance = 0;
function registerMouseEvents() {
  stage?.on('mousedown touchstart', function (e) {
    isDragging = true;
    dragStartX = stage!.getPointerPosition()?.x ?? 0;

    waveformDragStartTime = waveformParams!.startTime;
    waveformDragEndTime = waveformParams!.endTime;

    if (e.evt.touches.length > 1) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      const touch1X = touch1.clientX;
      const touch2X = touch2.clientX;

      initialTouchDistance = Math.abs(touch1X - touch2X);
    }
  });

  stage?.on('mouseup touchend', function (e) {
    isDragging = false;
  });

  stage?.on('mousemove touchmove', function (e) {
    if (isDragging) {
      const pointerPosX = stage!.getPointerPosition()?.x ?? 0;
      const deltaX = pointerPosX - dragStartX;

      const timeDeltaX = -((deltaX! / stage!.width()) * sound.value.duration);
      const newStartTime =
        timeDeltaX / zoomFactor.value + waveformDragStartTime;
      const newEndTime = timeDeltaX / zoomFactor.value + waveformDragEndTime;

      if (newStartTime >= 0 && newEndTime <= sound.value.duration) {
        waveformParams!.startTime = newStartTime;
        waveformParams!.endTime = newEndTime;
        updateWaveform();
      }
    }

    if (e.evt.touches.length > 1) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      const touch1X = touch1.clientX;
      const touch2X = touch2.clientX;

      const deltaX = Math.abs(touch1X - touch2X) - initialTouchDistance;

      const timeDeltaX = -((deltaX! / stage!.width()) * sound.value.duration);
      console.log(timeDeltaX);

      /* if (newStartTime >= 0 && newEndTime <= sound.value.duration) {
        waveformParams!.startTime = newStartTime;
        waveformParams!.endTime = newEndTime;
        updateWaveform();
      } */
    }
  });
}

function handleMouseWheel(event: WheelEvent) {
  if (event.deltaY < 0) {
    waveformZoom('in');
  } else {
    waveformZoom('out');
  }
}

function waveformZoom(direction: 'in' | 'out') {
  if (direction === 'out' && zoomFactor.value < 1.2) {
    setZoomFactor(1);
    return;
  }
  const centerTime = (waveformParams!.startTime + waveformParams!.endTime) / 2;
  const timeDelta = (waveformParams!.endTime - waveformParams!.startTime) / 2;

  const coef = direction === 'in' ? 1 / 1.2 : 1.2;
  const newStartTime = centerTime - timeDelta * coef;
  const newEndTime = centerTime + timeDelta * coef;

  waveformParams!.startTime = Math.max(0, newStartTime);
  waveformParams!.endTime = Math.min(sound.value.duration, newEndTime);

  zoomFactor.value =
    1 /
    ((waveformParams!.endTime - waveformParams!.startTime) /
      sound.value.duration);
  updateWaveform();
}

function setZoomFactor(newZoomFactor: number) {
  zoomFactor.value = newZoomFactor;
  if (zoomFactor.value === 1) {
    waveformParams!.startTime = 0;
    waveformParams!.endTime = sound.value.duration;
  } else {
    const centerTime =
      (waveformParams!.startTime + waveformParams!.endTime) / 2;
    const timeDelta = (waveformParams!.endTime - waveformParams!.startTime) / 2;
    waveformParams!.startTime = centerTime - timeDelta / zoomFactor.value;
    waveformParams!.endTime = centerTime + timeDelta / zoomFactor.value;
  }
  updateWaveform();
}
watch(
  () => zoomFactor.value,
  (newValue) => {
    if (newValue && waveformParams) {
      //setZoomFactor(newValue);
      updateWaveform();
    }
  }
);
watch(
  () => sound.value.waveformCalculated,
  (newValue) => {
    if (newValue) {
      updateWaveform();
    }
  }
);

watch(
  () => settingsStore.playerHeightFactor,
  (newValue) => {
    if (stage === null) return;
    stage.height(100 * newValue);
  }
);

watch(
  () => sound.value.isSelected,
  () => {
    sound.value.waveformShouldBeRedrawn = true;
  }
);
</script>

<style scoped>
.overview-container {
  height: 100px;
}
.zoom-container {
  height: 100px;
}
.waveform-canvas {
  width: 100%;
  height: 100px;
}
</style>
