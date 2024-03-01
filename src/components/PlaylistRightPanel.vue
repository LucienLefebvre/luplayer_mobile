<template>
  <div class="right-panel">
    <div class="row justify-center volume-label" style="height: 5%">
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
        @pan="faderTouchStart"
        @change="faderTouchEnd()"
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
import { useSettingsStore } from 'src/stores/settings-store';
import { NormalizableRange } from 'src/composables/normalizable-range';
import AddSoundButton from './AddSoundButton.vue';
import {
  isPlaylistSound,
  setSelectedSoundVolume,
  stopPlaylistActiveSound,
  stopSound,
} from 'src/composables/sound-controller';
const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

let normRange = new NormalizableRange(-60, 10, settingsStore.faderSkewFactor);

onMounted(() => {
  soundsStore.selectedSoundVolumeSliderValue = normRange.logScaleTo0to1(
    soundsStore.selectedSoundVolume
  );
});

watch(
  () => soundsStore.selectedSoundVolume,
  (newValue: number) => {
    if (soundsStore.selectedSound) {
      const newSliderValue = normRange.logScaleTo0to1(newValue);
      soundsStore.selectedSoundVolumeSliderValue = newSliderValue;
    }

    if (
      soundsStore.selectedSound &&
      newValue === -60 &&
      settingsStore.faderStop
    ) {
      stopSound(soundsStore.selectedSound, true);
      soundsStore.faderTouchedDuringPlayback = true;
    }
  }
);

watch(
  () => settingsStore.faderSkewFactor,
  (newValue: number) => {
    normRange.skew = newValue;
  }
);

function sliderValueChanged(value: number) {
  const normedValue = normRange.logScaleFrom0to1(value);
  setSelectedSoundVolume(normedValue);
}

function getVolumeLabelText() {
  return Math.round(soundsStore.selectedSoundVolume * 10) / 10 + 'dB';
}

function faderTouchStart(phase: any) {
  if (phase === 'start') {
    if (soundsStore.selectedSound === null) return;
    if (soundsStore.selectedSound.isPlaying) {
      soundsStore.faderTouchedDuringPlayback = true;
    }
    soundsStore.faderIsTouched = true;
  }
}

function faderTouchEnd() {
  if (soundsStore.selectedSound === null) return;
  if (
    soundsStore.faderTouchedDuringPlayback &&
    !soundsStore.selectedSound.isPlaying
  ) {
    soundsStore.selectedSoundVolume = 0;
  }
  soundsStore.faderTouchedDuringPlayback = false;
  soundsStore.faderIsTouched = false;
}
</script>

<style scoped>
.volume-label {
  font-size: 1rem;
  color: orange;
  user-select: none;
}
.right-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  width: 100%;
}
</style>
