<template>
  <canvas :width="canvasWidth()" class="progress-bar" ref="canvas"> </canvas>
</template>

<script setup lang="ts">
import { PropType, onMounted, ref } from 'vue';
import { SoundModel } from './models';

const canvas = ref<HTMLCanvasElement | null>(null);
var canvasCtx = null as CanvasRenderingContext2D | null;

const props = defineProps({
  sound: { type: Object as PropType<SoundModel | null>, required: true },
});

onMounted(() => {
  if (canvas.value) {
    canvasCtx = canvas.value.getContext('2d');

    const animate = () => {
      drawBar();
      requestAnimationFrame(animate);
    };
    animate();
  }
});

function drawBar() {
  if (!canvasCtx) return;
  if (props.sound == null) return;

  const barWidth =
    (props.sound.audioElement.currentTime / props.sound.audioElement.duration) *
    canvasCtx.canvas.width;
  const barHeight = canvasCtx.canvas.height;

  canvasCtx.clearRect(0, 0, canvasCtx.canvas.width, canvasCtx.canvas.height);
  canvasCtx.fillStyle = 'orange';

  canvasCtx.fillRect(0, 0, barWidth, barHeight);
}

function canvasWidth() {
  return canvas.value?.clientWidth ?? 0;
}
</script>

<style scoped>
.progress-bar {
  width: 100%;
  height: 15px;
  background-color: var(--bkgColor);
}
</style>
