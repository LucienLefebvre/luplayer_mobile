<template>
  <div style="position: relative">
    <div ref="minimapWaveformView" style="width: 100%"></div>
    <div ref="waveformNew" class="waveform-view"></div>
  </div>
</template>

<script setup lang="ts">
import { PropType, ref, onMounted, watch, Ref } from 'vue';
import { useSettingsStore } from '../stores/settings-store';
import { SoundModel } from './models';
import { Waveform } from 'src/composables/waveform';
import { dbToGain } from 'src/composables/math-helpers';
import { useSoundsStore } from 'src/stores/sounds-store';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();
const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});
const sound = ref(props.sound);

let waveform: Waveform;
const waveformNew = ref<HTMLDivElement | null>(null);

const emits = defineEmits(['click', 'doubleClick', 'long-touch']);

onMounted(async () => {
  if (!waveformNew.value) return;
  waveform = new Waveform(waveformNew.value, props.sound.audioElement);
  waveform.setHeight(settingsStore.playerHeightFactor * 100);
  waveform.setVerticalZoomFactor(settingsStore.waveformVerticalZoomFactor);
  waveform.showInTime = true;
  waveform.showOutTime = true;
  waveform.inTimeColor = 'lightblue';
  waveform.outTimeColor = 'yellow';
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
watch(
  () => sound.value.inTime,
  (newValue) => {
    console.log('inTime changed to ' + newValue);
    if (newValue) {
      waveform.setInTime(newValue);
    } else {
      waveform.setInTime(null);
    }
  }
);
watch(
  () => sound.value.outTime,
  (newValue) => {
    console.log('outTime changed to ' + newValue);
    if (newValue) {
      waveform.setOutTime(newValue);
    } else {
      waveform.setOutTime(null);
    }
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
      if (waveform?.getPlayedWaveformFillColor() !== 'red') {
        waveform?.setPlayedWaveformFillColor('red');
      }
    } else {
      if (waveform?.getPlayedWaveformFillColor() !== 'green')
        waveform?.setPlayedWaveformFillColor('green');
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
