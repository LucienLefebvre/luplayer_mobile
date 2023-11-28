<template>
  <div style="position: relative">
    <div ref="waveformNew" class="waveform-view"></div>
  </div>
</template>

<script setup lang="ts">
import { PropType, ref, onMounted, watch, Ref } from 'vue';
import { useSettingsStore } from '../stores/settings-store';
import { SoundModel } from './models';
import { Waveform } from 'src/composables/waveform';
import { dbToGain } from 'src/composables/math-helpers';

const settingsStore = useSettingsStore();
const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});
const sound = ref(props.sound);

let waveform = null as Waveform | null;
const waveformNew = ref<HTMLDivElement | null>(null);

const emits = defineEmits(['click', 'doubleClick', 'long-touch']);

onMounted(async () => {
  if (!waveformNew.value) return;
  waveform = new Waveform(
    waveformNew as Ref<HTMLDivElement>,
    props.sound.audioElement
  );
  waveform.setHeight(settingsStore.playerHeightFactor * 100);
  waveform.setVerticalZoomFactor(settingsStore.waveformVerticalZoomFactor);
  waveform.isDraggable = false;
  waveform.isZoomable = false;

  updateWaveformColor();

  waveform.addEventListener('click', (event) => {
    emits('click', event);
  });
  waveform.addEventListener('touchHold', (event) => {
    emits('long-touch', event);
  });
  waveform.addEventListener('waveformChunksCalculated', () => {
    console.log('waveformChunksCalculated');
  });

  waveform.calculateWaveformChunks().then((chunks) => {
    sound.value.waveformChunks = chunks;
  });
});

watch(
  () => settingsStore.playerHeightFactor,
  (newValue) => {
    waveform?.setHeight(newValue * 100);
  }
);

watch(
  () => sound.value.isSelected,
  () => {
    updateWaveformColor();
  }
);

function updateWaveformColor() {
  if (sound.value.isSelected) {
    waveform?.setRemainingWaveformFillColor('orange');
  } else {
    waveform?.setRemainingWaveformFillColor('rgb(40, 134, 189)');
  }
}

watch(
  () => sound.value.trimGain,
  (newValue) => {
    waveform?.setVerticalZoomFactor(dbToGain(newValue));
  }
);

watch(
  () => sound.value.remainingTime,
  (newValue) => {
    if (newValue < 5) {
      waveform?.setPlayedWaveformFillColor('red');
    }
  }
);

watch(
  () => sound.value.isPlaying,
  (newValue) => {
    updateWaveformColor();
  }
);
</script>

<style scoped>
.waveform-view {
  width: 100%;
}
</style>
