<template>
  <div style="position: relative">
    <div ref="waveformView"></div>
  </div>
</template>

<script setup lang="ts">
import { PropType, ref, onMounted, watch } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from '../stores/settings-store';
import { SoundModel } from './models';
import { dbToGain } from '../composables/math-helpers';
import {
  calculateYValueArrayFromChunks,
  drawWaveform,
} from 'src/composables/waveform-display';
import Konva from 'konva';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
  isSoundDetails: { type: Boolean, required: false, default: false },
});

const sound = ref(props.sound);
const waveformView = ref<HTMLDivElement | null>(null);
let waveformChunks = null as Float32Array | null;

onMounted(() => {
  if (!waveformView.value) return;
  const stage = new Konva.Stage({
    container: waveformView.value,
    width: 317,
    height: 100,
  });

  waveformChunks = new Float32Array(stage.width());

  const layer = new Konva.Layer();
  stage.add(layer);

  const anim = new Konva.Animation(function () {
    if (waveformChunks === null) return;
    drawWaveform(
      waveformChunks,
      props.sound,
      stage,
      layer,
      settingsStore.waveformVerticalZoomFactor
    );
  }, layer);

  anim.start();
});

watch(
  () => sound.value?.waveformCalculated,
  (newValue) => {
    if (newValue) {
      if (props.sound.waveform === null) return;
      const array = calculateYValueArrayFromChunks(
        props.sound.waveform,
        waveformView.value?.clientWidth ?? 0
      );
      waveformChunks = array;
    }
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
