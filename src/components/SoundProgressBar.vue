<template>
  <canvas :width="canvasWidth()" class="progress-bar" ref="canvas"> </canvas>
</template>

<script setup lang="ts">
import { PropType, onMounted, ref } from 'vue';
import { SoundModel } from './models';
import { useSoundsStore } from 'src/stores/sounds-store';
const canvas = ref<HTMLCanvasElement | null>(null);
var canvasCtx = null as CanvasRenderingContext2D | null;

const soundsStore = useSoundsStore();
const props = defineProps({
  isMainToolbar: { type: Boolean, required: false, default: false },
});

const barColor = ref('orange');
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
  if (soundsStore.selectedSound === null) return;

  const barWidth =
    (soundsStore.selectedSound.audioElement.currentTime /
      soundsStore.selectedSound.audioElement.duration) *
    canvasCtx.canvas.width;
  const barHeight = canvasCtx.canvas.height;

  canvasCtx.clearRect(0, 0, canvasCtx.canvas.width, canvasCtx.canvas.height);
  canvasCtx.fillStyle = barColor.value;

  if (props.isMainToolbar) {
    canvasCtx.fillRect(0, 0, barWidth, barHeight);
  } else {
    roundedRect(canvasCtx, 0, 0, barWidth, barHeight, 15);
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
  ctx.fill();
}

function canvasWidth() {
  return canvas.value?.clientWidth ?? 0;
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
