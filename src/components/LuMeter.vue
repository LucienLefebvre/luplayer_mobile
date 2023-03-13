<template>
  <canvas
    id="canvas"
    class="bar"
    :width="canvasWidth()"
    :height="canvasHeight()"
    ref="canvas"
  >
  </canvas>
</template>

<script setup lang="ts">
import { PropType, onMounted, ref, watch } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { scaleTo0to1 } from '../composables/math-helpers';
import { NormalizableRange } from 'src/composables/normalizable-range';
const props = defineProps({
  analyserNode: {
    type: Object as PropType<AnalyserNode | null | undefined>,
    required: true,
  },
});

const soundsStore = useSoundsStore();

const canvas = ref<HTMLCanvasElement | null>(null);
var canvasCtx = null as CanvasRenderingContext2D | null;

var range = -20 as number;
var normRange = new NormalizableRange(-20, 20);

onMounted(() => {
  if (canvas.value) {
    canvasCtx = canvas.value.getContext('2d');

    const size = 100;
    const scale = window.devicePixelRatio;
    canvas.value.width = Math.floor(size * scale);
    canvas.value.height = Math.floor(size * scale);
    canvasCtx?.scale(scale, scale);

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
const roundRectRadius = 5 as number;

function drawMeter() {
  if (!canvasCtx) return;

  drawBar();

  drawLufsLine(-10, 'rgba(255, 255, 255, 0.2 )', true);
  drawLufsLine(10, 'rgba(255, 255, 255, 0.2 )', true);
  drawLufsLine(0, 'rgba(255, 255, 255, 0.2 )', true);
}

function drawBar() {
  if (!canvasCtx) return;

  var canvasEl = document.getElementById('canvas');
  if (!canvasEl) return;
  const meterWidth = canvasEl.clientWidth;
  const meterHeight = canvasEl.clientHeight;

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
  canvasCtx.roundRect(0, 0, meterWidth, meterHeight, roundRectRadius);
  canvasCtx.stroke();
  canvasCtx.fill();

  // orange bar
  const barOrangeX = meterWidth * normRange.scaleTo0to1(currentValue);
  canvasCtx.strokeStyle = 'orange';
  canvasCtx.fillStyle = 'orange';
  canvasCtx.beginPath();
  canvasCtx.roundRect(0, 0, barOrangeX, meterHeight, roundRectRadius);
  canvasCtx.stroke();
  canvasCtx.fill();

  // green bar
  const barGreenX =
    meterWidth *
    Math.min(normRange.scaleTo0to1(currentValue), normRange.scaleTo0to1(0));
  canvasCtx.strokeStyle = 'green';
  canvasCtx.fillStyle = 'green';
  canvasCtx.beginPath();
  canvasCtx.roundRect(0, 0, barGreenX, meterHeight, roundRectRadius);
  canvasCtx.stroke();
  canvasCtx.fill();

  // text
  canvasCtx.fillStyle = 'white';
  canvasCtx.font = canvasHeight() * 0.6 + 'px Arial';
  canvasCtx.textAlign = 'left';
  canvasCtx.textBaseline = 'middle';
  const text = currentValue > -60 ? `${Math.round(currentValue)}LU` : '-inf';
  canvasCtx.fillText(text, 0, canvasHeight() / 2);
}

function drawLufsLine(lufs: number, color: string, drawText = false) {
  if (!canvasCtx) return;

  const meterWidth = canvasCtx.canvas.width;

  const lineX = normRange.scaleTo0to1(lufs) * meterWidth;

  canvasCtx.strokeStyle = color;
  canvasCtx.beginPath();
  canvasCtx.moveTo(lineX, 0);
  canvasCtx.lineTo(lineX, canvasCtx.canvas.height);
  canvasCtx.stroke();

  if (drawText) {
    canvasCtx.fillStyle = color;
    canvasCtx.font = canvasHeight() * 0.5 + 'px Arial';
    canvasCtx.textAlign = 'left';
    canvasCtx.textBaseline = 'middle';
    canvasCtx.fillText(`${lufs}`, lineX + 2, canvasHeight() / 2);
  }
}

watch(
  () => soundsStore.momentaryLoudness.value,
  (newValue) => {
    targetValue = newValue + 17;
  }
);

function canvasWidth() {
  return canvas.value?.clientWidth ?? 0;
}

function canvasHeight() {
  return canvas.value?.clientHeight ?? 0;
}
</script>

<style scoped>
.bar {
  transition: width 0.1s;
}
</style>
