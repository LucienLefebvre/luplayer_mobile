<template>
  <canvas class="bar" :width="canvasWidth()" ref="canvas"> </canvas>
</template>

<script setup lang="ts">
import { PropType, onMounted, ref, watch } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { scaleTo0to1 } from '../composables/math-helpers';

const props = defineProps({
  analyserNode: {
    type: Object as PropType<AnalyserNode | null | undefined>,
    required: true,
  },
});

const soundsStore = useSoundsStore();

const canvas = ref<HTMLCanvasElement | null>(null);
var canvasCtx = null as CanvasRenderingContext2D | null;
var previousPeakValue = 0 as number;
var peakHoldValue = 0 as number;
var peakHoldTimeOutHasBeenSet = false as boolean;
var peakValue = 0 as number;
const dbLinesToDraw = [-24, -12, -9, -6, -3] as number[];
var range = -60 as number;

var loudnessValue = 0 as number;

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

let currentValue = range;
let targetValue = range;
const lerpingSpeed = 0.5;
const lufsLinesArray = [-50, -40, -30, -20, -10] as number[];

function drawMeter() {
  if (!canvasCtx) return;

  const meterWidth = canvasCtx.canvas.width;
  const meterHeight = canvasCtx.canvas.height;

  drawBar();
  lufsLinesArray.forEach((value) => {
    drawLufsLine(value, 'black');
  });
  drawLufsLine(-23, 'red');
}

function drawBar() {
  if (!canvasCtx) return;

  const meterWidth = canvasCtx.canvas.width;
  const meterHeight = canvasCtx.canvas.height;

  //Draw bar
  if (isNaN(currentValue)) {
    currentValue = range;
  }
  currentValue += (targetValue - currentValue) * lerpingSpeed;

  canvasCtx.clearRect(0, 0, meterWidth, canvasCtx.canvas.height);

  //background
  canvasCtx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
  canvasCtx.fillStyle = 'rgba(0, 255, 0, 0.1)';
  canvasCtx.beginPath();
  canvasCtx.roundRect(0, 0, meterWidth, meterHeight, 10);
  canvasCtx.stroke();
  canvasCtx.fill();

  // orange bar
  const barOrangeX = meterWidth * scaleTo0to1(currentValue, range, 0);
  canvasCtx.strokeStyle = 'orange';
  canvasCtx.fillStyle = 'orange';
  canvasCtx.beginPath();
  canvasCtx.roundRect(0, 0, barOrangeX, meterHeight, 10);
  canvasCtx.stroke();
  canvasCtx.fill();

  // green bar
  const barGreenX =
    meterWidth *
    Math.min(scaleTo0to1(currentValue, range, 0), scaleTo0to1(-23, range, 0));
  canvasCtx.strokeStyle = 'green';
  canvasCtx.fillStyle = 'green';
  canvasCtx.beginPath();
  canvasCtx.roundRect(0, 0, barGreenX, meterHeight, 10);
  canvasCtx.stroke();
  canvasCtx.fill();

  // text
  canvasCtx.fillStyle = 'black';
  canvasCtx.font = '10px Arial';
  canvasCtx.fillText(
    `${Math.round(currentValue)} LUFS`,
    0,
    meterHeight / 2 + 5
  );
}

function drawLufsLine(lufs: number, color: string) {
  if (!canvasCtx) return;

  const meterWidth = canvasCtx.canvas.width;

  const lineX = scaleTo0to1(lufs, range, 0) * meterWidth;

  canvasCtx.strokeStyle = color;
  canvasCtx.beginPath();
  canvasCtx.moveTo(lineX, 0);
  canvasCtx.lineTo(lineX, canvasCtx.canvas.height);

  canvasCtx.stroke();
}

function scale(loudness: number) {
  var scaledValue = (loudness - range) / (0 - range);

  return scaledValue;
}

watch(
  () => soundsStore.momentaryLoudness.value,
  (newValue) => {
    targetValue = newValue - 6;
  }
);

function canvasWidth() {
  return canvas.value?.clientWidth ?? 0;
}
</script>

<style scoped>
.bar {
  transition: width 0.1s;
}
</style>
