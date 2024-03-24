<template>
  <div class="audio-settings-panel">
    <div class="audio-settings-row">
      <q-btn
        color="primary"
        label="trim gain"
        size="md"
        class="audio-settings-button"
        dense
      />
      <q-slider
        v-model="recorderStore.trimGain"
        color="orange"
        dense
        track-size="5px"
        thumb-size="25px"
        :min="-24"
        :max="24"
        :step="0.1"
        :markers="24"
        label
        class="audio-settings-slider"
      />
    </div>
    <div class="audio-settings-row">
      <q-btn
        :color="getHPFButtonColor()"
        label="hpf"
        size="md"
        class="audio-settings-button"
        dense
        @click="recorderStore.toggleHpf()"
      />
      <q-slider
        v-model="recorderStore.hpfFrequency"
        color="orange"
        dense
        track-size="5px"
        thumb-size="25px"
        :min="20"
        :max="200"
        :step="1"
        label
        :label-value="recorderStore.hpfFrequency + 'Hz'"
        class="audio-settings-slider"
        @update:model-value="recorderStore.setHpfFrequency"
      />
    </div>
    <div class="audio-settings-row">
      <q-btn
        :color="getLimiterButtonColor()"
        label="limter"
        size="md"
        class="audio-settings-button"
        dense
        @click="recorderStore.toggleLimiter()"
      />
      <q-slider
        v-model="recorderStore.limiterThreshold"
        color="orange"
        dense
        track-size="5px"
        thumb-size="25px"
        :min="-100"
        :max="0"
        :step="0.1"
        label
        :label-value="recorderStore.limiterThreshold + 'dBFS'"
        class="audio-settings-slider"
        @update:model-value="recorderStore.setLimiterThreshold"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRecorderStore } from 'src/stores/recorder-store';
const recorderStore = useRecorderStore();

function getHPFButtonColor() {
  return recorderStore.hpfEnabled ? 'green' : 'primary';
}

function getLimiterButtonColor() {
  return recorderStore.limiterEnabled ? 'green' : 'primary';
}
</script>

<style scoped>
.audio-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: var(--bkgColor);
  color: orange;
  padding: 5px;
  border-radius: 10px;
  margin: 5px;
  font-size: 20px;
}

.audio-settings-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}
.audio-settings-button {
  color: orange;
  flex: 0 0 120px;
}
.audio-settings-slider {
  flex: 1;
}
</style>
