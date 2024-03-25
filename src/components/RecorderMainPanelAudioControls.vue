<template>
  <div class="audio-settings-row">
    <q-btn
      :color="recorderStore.getButtonsColor()"
      icon="mic"
      size="md"
      label="settings"
      dense
      class="audio-settings-button"
      @click="audioSettingsButtonClicked"
    />

    <q-slider
      v-model="recorderStore.trimGain"
      :color="recorderStore.getButtonsColor()"
      dense
      class="trim-slider"
      track-size="5px"
      thumb-size="25px"
      :track-color="recorderStore.getButtonsColor()"
      :selection-color="recorderStore.getButtonsColor()"
      :min="-24"
      :max="24"
      :step="0.1"
      :markers="24"
      label
      :label-value="getTrimGainLabel()"
    />
  </div>
  <q-dialog v-model="showAudioSettingsDialog" position="bottom">
    <div class="recorded-sounds-dialog-panel-label">
      <q-btn
        color="red"
        icon="close"
        size="md"
        dense
        @click="showAudioSettingsDialog = false"
      />
      Audio settings :
    </div>
    <div class="audio-settings-dialog"><RecorderAudioSettingsPanel /></div>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import RecorderAudioSettingsPanel from './RecorderAudioSettingsPanel.vue';

import { RecorderState } from 'src/components/models';
import { useRecorderStore } from 'src/stores/recorder-store';
const recorderStore = useRecorderStore();

function getTrimGainLabel() {
  return recorderStore.trimGain.toFixed(1) + ' dB';
}

const showAudioSettingsDialog = ref(false);
async function audioSettingsButtonClicked() {
  if (recorderStore.recorder.state === RecorderState.NOT_INITIALIZED) {
    await recorderStore.init();
  }
  showAudioSettingsDialog.value = true;
}
</script>

<style scoped>
.audio-settings-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 30px;
  padding: 5px;
  gap: 10px;
}
.audio-settings-button {
  flex: 0 0 auto;
}
.trim-slider {
  flex: 1;
}
.audio-settings-dialog {
  width: 100%;
  max-height: 60%;
  background-color: var(--bkgColor);
  border-top-right-radius: 20px;
  border-top-left-radius: 20px;
  padding: 5px;
}
.recorded-sounds-dialog-panel-label {
  display: flex;
  flex-direction: row;
  font-size: 1.4rem;
  font-weight: bold;
  color: orange;
  padding: 10px;
  text-align: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
  border-radius: 20px;
}
</style>
