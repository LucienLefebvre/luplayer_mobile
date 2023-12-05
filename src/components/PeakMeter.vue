<template>
  <canvas
    :height="canvasHeight()"
    :width="canvasWidth()"
    ref="canvas"
    @click="resetPeakHold"
  >
  </canvas>
</template>

<script setup lang="ts">
import { useSettingsStore } from 'src/stores/settings-store';
import { useSoundsStore } from 'src/stores/sounds-store';
import { onMounted, ref, watch } from 'vue';
import { gainToDb } from '../composables/math-helpers';
import { StereoAnalyserObject } from './models';
import { NormalizableRange } from 'src/composables/normalizable-range';

const analyser = ref<StereoAnalyserObject | null>(null);

const settingsStore = useSettingsStore();
const soundsStore = useSoundsStore();

const canvas = ref<HTMLCanvasElement | null>(null);
var canvasCtx = null as CanvasRenderingContext2D | null;
var peakValue = [0, 0] as number[];
var previousPeakValue = [0, 0] as number[];
var peakHoldValue = 0 as number;
var peakHoldTimeOutHasBeenSet = false as boolean;

const dbLinesToDraw = [-40, -30, -20, -10] as number[];
const range = -60 as number;
const roundRectRadius = 5 as number;

const normRange = new NormalizableRange(-60, 0, 5);

onMounted(() => {
  if (canvas.value) {
    canvasCtx = canvas.value.getContext('2d');
    const animate = () => {
      drawMeter();
      requestAnimationFrame(animate);
    };
    animate();
    window.addEventListener('resize', setCanvasSize);
  }
});

function drawMeter() {
  if (!canvasCtx) return;

  const drawStart = performance.now();

  const meterWidth = canvasCtx.canvas.width;
  const meterHeight = canvasCtx.canvas.height;
  canvasCtx.clearRect(0, 0, meterWidth, meterHeight);

  //background
  canvasCtx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
  canvasCtx.fillStyle = 'rgba(0, 255, 0, 0.1)';
  canvasCtx.beginPath();
  canvasCtx.roundRect(0, 0, meterWidth, meterHeight, roundRectRadius);
  canvasCtx.stroke();
  canvasCtx.fill();

  drawBar(0);
  drawBar(1);

  dbLinesToDraw.forEach((value) => {
    drawDbLines(value, 'rgba(255, 255, 255, 0.2 )', true);
  });

  if (peakHoldValue > 0) {
    drawDbLines(gainToDb(peakHoldValue), 'red');
  }
  const drawEnd = performance.now();
  //console.log(`drawMeter: ${drawEnd - drawStart}ms`);
}

function drawBar(channelToDraw: number) {
  if (!canvasCtx) return;

  const data: Float32Array = new Float32Array(
    analyser.value?.analysers[channelToDraw].frequencyBinCount ?? 0
  );

  //calculate peak value to display
  analyser.value?.analysers[channelToDraw].getFloatTimeDomainData(data);
  const maxValue = Math.max(...data);
  peakValue[channelToDraw] = Math.max(
    maxValue,
    previousPeakValue[channelToDraw] * 0.95
  );
  previousPeakValue = peakValue;

  //peak hold
  peakHoldValue = Math.max(maxValue, peakHoldValue);
  if (peakValue[channelToDraw] < peakHoldValue) {
    setPeakHoldTimeOut();
  }
  const meterWidth = canvasCtx.canvas.width;
  const meterHeight = canvasCtx.canvas.height;

  const barHeight = meterHeight / 2;
  const barY = (channelToDraw * meterHeight) / 2;

  //bar
  const barX =
    meterWidth * normRange.logScaleTo0to1(gainToDb(peakValue[channelToDraw]));
  const barOrangeX =
    meterWidth *
    Math.min(
      normRange.logScaleTo0to1(gainToDb(peakValue[channelToDraw])),
      normRange.logScaleTo0to1(-settingsStore.peakMeterRedThreshold)
    );
  const barGreenX =
    meterWidth *
    Math.min(
      normRange.logScaleTo0to1(gainToDb(peakValue[channelToDraw])),
      normRange.logScaleTo0to1(-settingsStore.peakMeterOrangeThreshold)
    );
  drawColorBar(barX, barY, barHeight, 'red');
  drawColorBar(barOrangeX, barY, barHeight, 'orange');
  drawColorBar(barGreenX, barY, barHeight, 'green');

  // text
  canvasCtx.fillStyle = 'white';
  canvasCtx.font = canvasHeight() * 0.6 + 'px Arial';
  canvasCtx.textAlign = 'left';
  canvasCtx.textBaseline = 'middle';
  const peakHoldDbValue = gainToDb(peakHoldValue);
  const text =
    peakHoldDbValue > range ? `${Math.round(peakHoldDbValue)}dBfs` : '-inf';
  canvasCtx.fillText(text, 0, canvasHeight() / 2);
}

function drawColorBar(
  width: number,
  ypos: number,
  height: number,
  color: string
) {
  if (!canvasCtx) return;

  canvasCtx.strokeStyle = color;
  canvasCtx.fillStyle = color;
  canvasCtx.beginPath();
  canvasCtx.roundRect(0, ypos, width, height, roundRectRadius);
  canvasCtx.stroke();
  canvasCtx.fill();
}

function drawDbLines(db: number, color: string, drawText = false) {
  if (!canvasCtx) return;

  const meterWidth = canvasCtx.canvas.width;

  const x = meterWidth * normRange.logScaleTo0to1(db);

  canvasCtx.strokeStyle = color;
  canvasCtx.beginPath();
  canvasCtx.moveTo(x, 0);
  canvasCtx.lineTo(x, canvasCtx.canvas.height);
  canvasCtx.stroke();

  if (drawText) {
    canvasCtx.fillStyle = color;
    canvasCtx.font = canvasHeight() * 0.5 + 'px Arial';
    canvasCtx.textAlign = 'left';
    canvasCtx.textBaseline = 'middle';
    const text = `${Math.round(db)}`;
    canvasCtx.fillText(text, x, canvasHeight() / 2);
  }
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

function canvasHeight() {
  return canvas.value?.clientHeight ?? 0;
}

function setCanvasSize() {
  if (canvas.value) {
    canvas.value.width = canvasWidth();
    canvas.value.height = canvasHeight();
  }
}

watch(
  () => soundsStore.outputAnalyserNodes,
  (newValue) => {
    if (newValue) {
      analyser.value = newValue;
    }
  }
);
</script>

<style scoped></style>
