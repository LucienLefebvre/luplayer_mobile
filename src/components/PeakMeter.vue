<template>
  <canvas :width="canvasWidth()" ref="canvas" @click="resetPeakHold"> </canvas>
</template>

<script setup lang="ts">
import { useSettingsStore } from 'src/stores/settings-store';
import { PropType, onMounted, ref } from 'vue';
import { dbToGain, gainToDb, scaleTo0to1 } from '../composables/math-helpers';
import { StereoAnalyserObject } from './models';
const props = defineProps({
  analyserObject: {
    type: Object as PropType<StereoAnalyserObject | null>,
    required: true,
  },
});

const settingsStore = useSettingsStore();
const canvas = ref<HTMLCanvasElement | null>(null);
var canvasCtx = null as CanvasRenderingContext2D | null;
var peakValue = [0, 0] as number[];
var previousPeakValue = [0, 0] as number[];
var peakHoldValue = 0 as number;
var peakHoldTimeOutHasBeenSet = false as boolean;

const dbLinesToDraw = [-40, -20, -9, -6, -3] as number[];
const range = -60 as number;
onMounted(() => {
  if (canvas.value) {
    canvasCtx = canvas.value.getContext('2d');
    const animate = () => {
      drawMeter();
      requestAnimationFrame(animate);
    };
    animate();
  }
});

function drawMeter() {
  if (!canvasCtx) return;

  const meterWidth = canvasCtx.canvas.width;
  const meterHeight = canvasCtx.canvas.height;
  canvasCtx.clearRect(0, 0, meterWidth, meterHeight);

  //background
  canvasCtx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
  canvasCtx.fillStyle = 'rgba(0, 255, 0, 0.1)';
  canvasCtx.beginPath();
  canvasCtx.roundRect(0, 0, meterWidth, meterHeight, 10);
  canvasCtx.stroke();
  canvasCtx.fill();

  drawBar(0);
  drawBar(1);

  dbLinesToDraw.forEach((db) => {
    drawDbLines(scaleTo0to1(db, range, 0), 'black');
  });

  if (peakHoldValue > 0) {
    drawDbLines(scaleTo0to1(gainToDb(peakHoldValue), range, 0), 'red');
  }
}

function drawBar(channelToDraw: number) {
  if (!canvasCtx) return;

  const data: Float32Array = new Float32Array(
    props.analyserObject?.analysers[channelToDraw].frequencyBinCount ?? 0
  );

  props.analyserObject?.analysers[channelToDraw].getFloatTimeDomainData(data);
  const maxValue = Math.max(...data);
  peakValue[channelToDraw] = Math.max(
    maxValue,
    previousPeakValue[channelToDraw] * 0.95
  );
  previousPeakValue = peakValue;

  peakHoldValue = Math.max(maxValue, peakHoldValue);
  if (peakValue[channelToDraw] < peakHoldValue) {
    setPeakHoldTimeOut();
  }
  const meterWidth = canvasCtx.canvas.width;
  const meterHeight = canvasCtx.canvas.height;
  const barHeight = meterHeight / 2;
  const barY = channelToDraw * barHeight;

  // red
  const barX =
    meterWidth * scaleTo0to1(gainToDb(peakValue[channelToDraw]), range, 0);
  canvasCtx.strokeStyle = 'red';
  canvasCtx.fillStyle = 'red';
  canvasCtx.beginPath();
  canvasCtx.roundRect(0, barY, barX, barHeight, 10);
  canvasCtx.stroke();
  canvasCtx.fill();

  // orange bar
  const barOrangeX =
    meterWidth *
    Math.min(
      scaleTo0to1(gainToDb(peakValue[channelToDraw]), range, 0),
      scaleTo0to1(settingsStore.peakMeterRedThreshold, range, 0)
    );
  canvasCtx.strokeStyle = 'orange';
  canvasCtx.fillStyle = 'orange';
  canvasCtx.beginPath();
  canvasCtx.roundRect(0, barY, barOrangeX, barHeight, 10);
  canvasCtx.stroke();
  canvasCtx.fill();

  // green bar
  const barGreenX =
    meterWidth *
    Math.min(
      scaleTo0to1(gainToDb(peakValue[channelToDraw]), range, 0),
      scaleTo0to1(settingsStore.peakMeterOrangeThreshold, range, 0)
    );
  canvasCtx.strokeStyle = 'green';
  canvasCtx.fillStyle = 'green';
  canvasCtx.beginPath();
  canvasCtx.roundRect(0, barY, barGreenX, barHeight, 10);
  canvasCtx.stroke();
  canvasCtx.fill();
}

function drawDbLines(db: number, color: string) {
  if (!canvasCtx) return;

  const meterWidth = canvasCtx.canvas.width;

  canvasCtx.strokeStyle = color;
  canvasCtx.beginPath();
  canvasCtx.moveTo(db * meterWidth, 0);
  canvasCtx.lineTo(db * meterWidth, canvasCtx.canvas.height);

  canvasCtx.stroke();
}

function setPeakHoldTimeOut() {
  if (!peakHoldTimeOutHasBeenSet) {
    setTimeout(resetPeakHold, 1500);
    peakHoldTimeOutHasBeenSet = true;
  }
}

function resetPeakHold() {
  peakHoldValue = peakValue[0]; //TODO change
  peakHoldTimeOutHasBeenSet = false;
}

function canvasWidth() {
  return canvas.value?.clientWidth ?? 0;
}
</script>

<style scoped></style>
