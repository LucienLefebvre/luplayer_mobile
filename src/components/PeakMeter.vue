<template>
  <div ref="peakMeter"></div>
  <!--     <canvas
      :height="canvasHeight() / 2"
      :width="canvasWidth()"
      ref="canvas"
      @click="resetPeakHold"
    >
    </canvas> -->
</template>

<script setup lang="ts">
import { useSettingsStore } from 'src/stores/settings-store';
import { useSoundsStore } from 'src/stores/sounds-store';
import { onMounted, ref, watch } from 'vue';
import { gainToDb, dbToGain } from '../composables/math-helpers';
import { MeterBar, StereoAnalyserObject } from './models';
import { NormalizableRange } from 'src/composables/normalizable-range';
import Konva from 'konva';
import { FastLayer } from 'konva/lib/FastLayer';
import { getCssVar } from 'quasar';
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

const peakMeter = ref<HTMLDivElement | null>(null);
let stage: Konva.Stage;

let meterBarLayer: Konva.Layer;
const meterBars: MeterBar[] = [];
let peakHoldText: Konva.Text;
let peakHoldLine: Konva.Line;

const graduationLines: Konva.Line[] = [];
const graduationTexts: Konva.Text[] = [];
const graduationLayer = new Konva.Layer();

onMounted(() => {
  /*   if (canvas.value) {
    canvasCtx = canvas.value.getContext('2d');
    const animate = () => {
      drawMeter();
      requestAnimationFrame(animate);
    };
    //animate();
    window.addEventListener('resize', setCanvasSize);
  } */
  /////General
  if (!peakMeter.value) return;
  stage = new Konva.Stage({
    container: peakMeter.value,
    width: peakMeter.value.clientWidth,
    height: peakMeter.value.clientHeight,
  });

  /////Bars
  meterBarLayer = new Konva.Layer();
  stage.add(meterBarLayer);

  const left: MeterBar = {
    red: meterBarRectBuilder('red'),
    orange: meterBarRectBuilder('orange'),
    green: meterBarRectBuilder('green'),
  };
  const right: MeterBar = {
    red: meterBarRectBuilder('red'),
    orange: meterBarRectBuilder('orange'),
    green: meterBarRectBuilder('green'),
  };
  meterBars.push(left);
  meterBars.push(right);

  ////Peak hold Text
  peakHoldText = new Konva.Text({
    x: 5,
    y: 6,
    text: '0',
    fontSize: 18,
    fontFamily: 'Calibri',
    fill: 'white',
    opacity: 0.8,
  });
  meterBarLayer.add(peakHoldText);

  //////Peak hold line
  peakHoldLine = new Konva.Line({
    points: [0, 0, 0, 0],
    stroke: 'white',
    strokeWidth: 2,
  });
  meterBarLayer.add(peakHoldLine);
  ////Graduation lines
  dbLinesToDraw.forEach((value) => {
    const line = new Konva.Line({
      points: [0, 0, 0, 0],
      stroke: 'black',
      strokeWidth: 1,
      opacity: 0.5,
    });
    graduationLines.push(line);
    graduationLayer.add(line);
    const text = new Konva.Text({
      x: 0,
      y: 0,
      text: `${value}`,
      fontSize: 14,
      fontFamily: 'Calibri',
      fill: 'black',
      opacity: 0.5,
      strokeWidth: 2,
    });
    graduationTexts.push(text);
    graduationLayer.add(text);
  });
  stage.add(graduationLayer);
  ////Animation
  const anim = new Konva.Animation(() => {
    draw();
  }, meterBarLayer);
  anim.start();
});

function meterBarRectBuilder(color: string): Konva.Rect {
  const bar = new Konva.Rect({
    x: 0,
    y: 0,
    width: 0,
    height: stage.height() / 2,
    fill: color,
    cornerRadius: 5,
  });
  meterBarLayer.add(bar);
  return bar;
}
function draw() {
  if (!peakMeter.value) return;
  const meterWidth = peakMeter.value.clientWidth;
  const meterHeight = peakMeter.value.clientHeight;

  drawBar(0);
  drawBar(1);
  drawPeakHoldText();
  drawGraduationLines();
  drawPeakHoldLine();
  meterBarLayer.draw();
}

function drawBar(channelToDraw: number) {
  const data: Float32Array = new Float32Array(
    analyser.value?.analysers[channelToDraw].frequencyBinCount ?? 0
  );

  analyser.value?.analysers[channelToDraw].getFloatTimeDomainData(data);
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
  const meterWidth = stage.width();
  const meterHeight = stage.height();

  const barHeight = meterHeight / 2;
  const barY = (channelToDraw * meterHeight) / 2;
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
  meterBars[channelToDraw].red.width(barX);
  meterBars[channelToDraw].orange.width(barOrangeX);
  meterBars[channelToDraw].green.width(barGreenX);
  meterBars[channelToDraw].red.y(barY);
  meterBars[channelToDraw].orange.y(barY);
  meterBars[channelToDraw].green.y(barY);
  meterBars[channelToDraw].red.height(barHeight);
  meterBars[channelToDraw].orange.height(barHeight);
  meterBars[channelToDraw].green.height(barHeight);
}

function drawPeakHoldText() {
  const peakHoldDbValue = gainToDb(peakHoldValue);
  const text =
    peakHoldDbValue > range ? `${Math.round(peakHoldDbValue)}dBfs` : '-80dBfs';

  peakHoldText.text(text);
}

function drawGraduationLines() {
  const meterWidth = stage.width();
  const meterHeight = stage.height();
  const barHeight = meterHeight;

  dbLinesToDraw.forEach((value, index) => {
    const x = meterWidth * normRange.logScaleTo0to1(value);
    graduationLines[index].points([x, 0, x, barHeight]);
    graduationTexts[index].y(8);
    graduationTexts[index].x(x);
  });
}

function drawPeakHoldLine() {
  let color = 'green';
  const peakHoldDbValue = gainToDb(peakHoldValue);
  if (peakHoldDbValue > -settingsStore.peakMeterOrangeThreshold) {
    color = 'orange';
  }
  if (peakHoldDbValue > -settingsStore.peakMeterRedThreshold) {
    color = 'red';
  }

  const meterWidth = stage.width();
  const x = meterWidth * normRange.logScaleTo0to1(peakHoldDbValue);
  peakHoldLine.points([x, 0, x, stage.height()]);
  peakHoldLine.stroke(color);
}
/* function drawBar(channelToDraw: number) {
  // text
  canvasCtx.fillStyle = 'white';
  canvasCtx.font = canvasHeight() * 0.6 + 'px Arial';
  canvasCtx.textAlign = 'left';
  canvasCtx.textBaseline = 'middle';
  const peakHoldDbValue = gainToDb(peakHoldValue);
  const text =
    peakHoldDbValue > range ? `${Math.round(peakHoldDbValue)}dBfs` : '-inf';
  canvasCtx.fillText(text, 0, canvasHeight() / 2);
} */

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

<style scoped>
.peak-meter {
  height: 30px;
}
</style>
