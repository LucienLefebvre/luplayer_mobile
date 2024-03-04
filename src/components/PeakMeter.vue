<template>
  <div ref="peakMeter"></div>
</template>

<script setup lang="ts">
import { useSettingsStore } from 'src/stores/settings-store';
import { useSoundsStore } from 'src/stores/sounds-store';
import { onMounted, ref, watch } from 'vue';
import { gainToDb, dbToGain } from 'src/scripts/math-helpers';
import { MeterBar, StereoAnalyserObject } from './models';
import { NormalizableRange } from 'src/scripts/normalizable-range';
import Konva from 'konva';
const analyser = ref<StereoAnalyserObject | null>(null);

const settingsStore = useSettingsStore();
const soundsStore = useSoundsStore();

var peakValue = [0, 0] as number[];
var previousPeakValue = [0, 0] as number[];
var peakHoldValue = 0 as number;
var peakHoldTimeOutHasBeenSet = false as boolean;

const dbLinesToDraw = [-40, -30, -20, -10] as number[];
const range = -60 as number;

const normRange = new NormalizableRange(-60, 0, 2);
let rangedRedThreshold = normRange.logScaleTo0to1(
  -settingsStore.peakMeterRedThreshold
);
let rangeOrangeThreshold = normRange.logScaleTo0to1(
  -settingsStore.peakMeterOrangeThreshold
);

const peakMeter = ref<HTMLDivElement | null>(null);
let stage: Konva.Stage;

let meterBarLayer: Konva.Layer;
let backgroundMeterBars: MeterBar;
const meterBars: MeterBar[] = [];
let peakHoldText: Konva.Text;
let peakHoldLine: Konva.Line;

const graduationLines: Konva.Line[] = [];
const graduationTexts: Konva.Text[] = [];
const graduationLayer = new Konva.Layer();

onMounted(() => {
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

  const background: MeterBar = {
    red: meterBarRectBuilder('red', 0.2, 0),
    orange: meterBarRectBuilder('orange', 0.2, 0),
    green: meterBarRectBuilder('green', 0.2, 0),
  };
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
  backgroundMeterBars = background;
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
      fontFamily: 'Roboto',
      fontStyle: 'bold',
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
    if (!settingsStore.showPeakMeter) return;
    draw();
  }, meterBarLayer);
  anim.start();
});

function meterBarRectBuilder(
  color: string,
  opacity = 1,
  cornerRadius = 5
): Konva.Rect {
  const bar = new Konva.Rect({
    x: -10,
    y: 0,
    width: 0,
    height: stage.height() / 2,
    fill: color,
    cornerRadius: cornerRadius,
    opacity: opacity,
  });
  meterBarLayer.add(bar);
  return bar;
}

function draw() {
  if (!peakMeter.value) return;

  drawBackgroundBars();
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
  const meterWidth = stage.width() + 10;
  const meterHeight = stage.height();

  const barHeight = meterHeight / 2;
  const barY = (channelToDraw * meterHeight) / 2;
  const barX =
    meterWidth * normRange.logScaleTo0to1(gainToDb(peakValue[channelToDraw]));
  const barOrangeX =
    meterWidth *
    Math.min(
      normRange.logScaleTo0to1(gainToDb(peakValue[channelToDraw])),
      rangedRedThreshold
    );
  const barGreenX =
    meterWidth *
    Math.min(
      normRange.logScaleTo0to1(gainToDb(peakValue[channelToDraw])),
      rangeOrangeThreshold
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

function drawBackgroundBars() {
  const meterWidth = stage.width();
  const meterHeight = stage.height();

  const redWidth = meterWidth - meterWidth * rangedRedThreshold;
  backgroundMeterBars.red.width(redWidth);
  backgroundMeterBars.red.x(meterWidth - redWidth);

  const orangeWidth = meterWidth - meterWidth * rangeOrangeThreshold;
  backgroundMeterBars.orange.width(orangeWidth);
  backgroundMeterBars.orange.x(meterWidth - orangeWidth);

  const greenWidth = meterWidth * rangeOrangeThreshold;
  backgroundMeterBars.green.width(greenWidth);
  backgroundMeterBars.green.x(0);

  backgroundMeterBars.red.height(meterHeight);
  backgroundMeterBars.orange.height(meterHeight);
  backgroundMeterBars.green.height(meterHeight);
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

watch(
  () => soundsStore.outputAnalyserNodes,
  (newValue) => {
    if (newValue) {
      analyser.value = newValue;
    }
  }
);

watch(
  () => settingsStore.peakMeterRedThreshold,
  (newValue) => {
    rangedRedThreshold = normRange.logScaleTo0to1(-newValue);
  }
);

watch(
  () => settingsStore.peakMeterOrangeThreshold,
  (newValue) => {
    rangeOrangeThreshold = normRange.logScaleTo0to1(-newValue);
  }
);
</script>

<style scoped>
.peak-meter {
  height: 30px;
}
</style>
