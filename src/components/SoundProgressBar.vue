<template>
  <div ref="bar" class="progress-bar"></div>
</template>

<script setup lang="ts">
import { PropType, onMounted, ref } from 'vue';
import { SoundModel } from './models';
import Konva from 'konva';

defineExpose({
  setSound,
  setBarColor,
});

/* const props = defineProps({
  sound: { type: Object as PropType<SoundModel | null> },
}); */

const sound = ref<SoundModel | null>(null);

function setSound(s: SoundModel) {
  sound.value = s;

  sound.value?.audioElement.addEventListener('play', () => {
    anim.start();
  });
}

const bar = ref<HTMLDivElement | null>(null);
let stage: Konva.Stage;
let layer: Konva.Layer;
let progressRect: Konva.Rect;
let anim: Konva.Animation;

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
  anim = new Konva.Animation(() => {
    drawBar();
  }, stage);

  anim.start();
});

function drawBar() {
  if (!sound.value) return;
  const currentTime = sound.value.audioElement.currentTime;
  const duration = sound.value.audioElement.duration;
  let barWidth = (currentTime / duration) * stage.width();
  if (isNaN(barWidth)) barWidth = 0;
  const barHeight = stage.height();

  progressRect.width(barWidth);
  progressRect.height(barHeight);
  progressRect.fill(barColor.value);

  stage.draw();

  if (!sound.value?.isPlaying) {
    progressRect.width(0);
    stage.draw();
    anim.stop();
  }
}

function setBarColor(color: string) {
  barColor.value = color;
}
</script>

<style scoped>
.progress-bar {
  width: 100%;
  height: 24px;
}
</style>
