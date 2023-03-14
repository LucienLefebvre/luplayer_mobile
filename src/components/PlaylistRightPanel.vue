<template>
  <div class="column q-py-sm fit justifi-center" style="min-height: inherit">
    <div
      class="row justify-center volumeLabel"
      style="height: 5%"
      @dblclick="soundsStore.selectedSoundVolume = 0"
    >
      {{ getVolumeLabelText() }}
    </div>
    <div class="row justify-center flex" style="height: 85%">
      <q-slider
        style="height: 100%"
        vertical
        reverse
        v-model="soundsStore.selectedSoundVolumeSliderValue"
        :min="0"
        :max="1"
        :step="0.001"
        color="orange"
        thumb-size="40px"
        track-size="8px"
        @update:model-value="sliderValueChanged($event!)"
      />
    </div>
    <div class="row justify-center q-pa-sm" style="height: 10%; width: 100%">
      <add-sound-button />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { dbToGain } from '../composables/math-helpers';
import { NormalizableRange } from 'src/composables/normalizable-range';
import AddSoundButton from './AddSoundButton.vue';
const soundsStore = useSoundsStore();

onMounted(() => {
  soundsStore.selectedSoundVolumeSliderValue = normRange.logScaleTo0to1(
    soundsStore.selectedSoundVolume
  );
});

watch(
  () => soundsStore.selectedSoundVolume,
  (newValue: number) => {
    if (soundsStore.selectedSound !== null) {
      soundsStore.selectedSound.volumeGainNode.gain.value = dbToGain(newValue);
      soundsStore.selectedSoundVolumeSliderValue =
        normRange.logScaleTo0to1(newValue);
    }
  }
);

const normRange = new NormalizableRange(-60, 10, 2);

function sliderValueChanged(value: number) {
  const normedValue = normRange.logScaleFrom0to1(value);
  soundsStore.selectedSoundVolume = normedValue;
}

function getVolumeLabelText() {
  return Math.round(soundsStore.selectedSoundVolume * 10) / 10 + 'dB';
}
</script>

<style scoped>
.volumeLabel {
  font-size: 1rem;
  color: orange;
}
</style>
