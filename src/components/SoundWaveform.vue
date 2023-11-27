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
  isSoundDetails: { type: Boolean, required: false, default: false },
});
const sound = ref(props.sound);

let waveform = null as Waveform | null;
const waveformNew = ref<HTMLDivElement | null>(null);

const emits = defineEmits(['click', 'doubleClick', 'long-touch']);

onMounted(async () => {
  if (!waveformNew.value) return;
  waveform = new Waveform(waveformNew as Ref<HTMLDivElement>, props.sound);
  waveform.setHeight(settingsStore.playerHeightFactor * 100);
  waveform.setVerticalZoomFactor(settingsStore.waveformVerticalZoomFactor);
  console.log(sound.value.trimGain);
  await waveform.calculateWaveformChunks();

  waveform.addEventListener('click', (event) => {
    emits('click', event);
  });
  waveform.addEventListener('touchHold', (event) => {
    emits('long-touch', event);
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
    waveform?.updateWaveform();
  }
);

watch(
  () => sound.value.trimGain,
  (newValue) => {
    console.log('trimGain', newValue);
    waveform?.setAudioGain(dbToGain(newValue));
  }
);
</script>

<style scoped>
.waveform-view {
  width: 100%;
}
</style>
