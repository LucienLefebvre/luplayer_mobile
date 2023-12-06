<template>
  <div ref="bar" class="progress-bar"></div>
</template>

<script setup lang="ts">
import { PropType, onMounted, ref } from 'vue';
import { SoundModel } from './models';
import Konva from 'konva';

const props = defineProps({
  sound: { type: Object as PropType<SoundModel | null> },
});

const bar = ref<HTMLDivElement | null>(null);
let stage: Konva.Stage;
let layer: Konva.Layer;
let progressRect: Konva.Rect;

const barColor = ref('orange');
onMounted(() => {
  if (!bar.value) return;
  stage = new Konva.Stage({
    container: bar.value,
    width: bar.value.clientWidth,
    height: bar.value.clientHeight,
  });
  layer = new Konva.Layer();
  stage.add(layer);
  progressRect = new Konva.Rect({
    x: 0,
    y: 0,
    width: 0,
    height: bar.value.clientHeight,
    fill: barColor.value,
  });
  layer.add(progressRect);
  const anim = new Konva.Animation(() => {
    drawBar();
  }, stage);

  anim.start();
});

function drawBar() {
  if (!props.sound) return;
  const currentTime = props.sound.audioElement.currentTime;
  const duration = props.sound.audioElement.duration;
  const barWidth = (currentTime / duration) * stage!.width();
  const barHeight = stage.height();

  progressRect.width(barWidth);
  progressRect.height(barHeight);
  progressRect.fill(barColor.value);

  stage.draw();
}

function setBarColor(color: string) {
  barColor.value = color;
}

defineExpose({
  setBarColor,
});
</script>

<style scoped>
.progress-bar {
  width: 100%;
  height: 24px;
}
</style>
