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

defineExpose({
  setAnalyserObject,
  setIsMono,
});

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
  });

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
  if (analyser.value === null) return;
  drawBar(0);
  if (!isMono) drawBar(1);
}

function drawBar(channelToDraw: number) {
  const stageWidth = stage.width();
  const stageHeight = stage.height();
  const data = new Uint8Array(
    analyser.value?.analysers[0].frequencyBinCount ?? 0
  );
  analyser.value?.analysers[channelToDraw].getByteTimeDomainData(data);
  const maxValue = Math.max(...data) - 128;

  peakValue[channelToDraw] = Math.max(
    maxValue / 128,
    previousPeakValue[channelToDraw] * 0.95
  );
  previousPeakValue = peakValue;

  peakHoldValue = Math.max(maxValue, peakHoldValue);
  if (peakValue[channelToDraw] < peakHoldValue) {
    setPeakHoldTimeOut();
  }

  const barWidth = stageWidth + 10;
  const barHeight = isMono ? stageHeight : stageHeight / 2;
  const barY = (channelToDraw * stageHeight) / 2;
  const normalizedBarX = normRange.logScaleTo0to1(
    gainToDb(peakValue[channelToDraw])
  );
  const barX = barWidth * normalizedBarX;
  const barOrangeX = barWidth * Math.min(normalizedBarX, rangedRedThreshold);
  const barGreenX = barWidth * Math.min(normalizedBarX, rangeOrangeThreshold);

  const meterBarsChannel = meterBars[channelToDraw];
  meterBarsChannel.red.width(barX);
  meterBarsChannel.orange.width(barOrangeX);
  meterBarsChannel.green.width(barGreenX);
  meterBarsChannel.red.y(barY);
  meterBarsChannel.orange.y(barY);
  meterBarsChannel.green.y(barY);
  meterBarsChannel.red.height(barHeight);
  meterBarsChannel.orange.height(barHeight);
  meterBarsChannel.green.height(barHeight);
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
  peakHoldValue = Math.max(peakValue[0], peakValue[1]);
  peakHoldTimeOutHasBeenSet = false;
}

watch(
  () => soundsStore.outputAnalyserNodes,
  (newValue) => {
    if (newValue) {
      setAnalyserObject(newValue);
    }
  }
);

function setAnalyserObject(a: StereoAnalyserObject) {
  analyser.value = a;
}

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

const resizeObserver = new ResizeObserver((entries) => {
  for (let entry of entries) {
    const { width, height } = entry.contentRect;
    stage.width(width);
    stage.height(height);

    drawBackgroundBars();
    drawPeakHoldText();
    drawGraduationLines();
    drawPeakHoldLine();
  }
});
onMounted(() => {
  if (!peakMeter.value) return;
  resizeObserver.observe(peakMeter.value!);
});

let isMono = false;
function setIsMono(b: boolean) {
  isMono = b;
  if (isMono) {
    meterBars[1].red.hide();
    meterBars[1].orange.hide();
    meterBars[1].green.hide();
  } else {
    meterBars[1].red.show();
    meterBars[1].orange.show();
    meterBars[1].green.show();
  }
}
</script>

<style scoped></style>
