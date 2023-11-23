<template>
  <div class="separator-div">
    <PeakMeter
      v-if="settingsStore.showPeakMeter"
      :analyserObject="soundsStore.outputAnalyserNodes"
      class="metersStyle"
    />

    <LuMeter
      v-if="settingsStore.showLuMeter"
      :analyserNode="soundsStore.outputAnalyserNodes?.stereoAnalyser"
      class="metersStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from '../stores/settings-store';
import PeakMeter from './PeakMeter.vue';
import LuMeter from './LuMeter.vue';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();
</script>

<style scoped>
.metersStyle {
  height: 30px;
  width: 100%;
}
.separator-div {
  width: 100%;
  border-top: 2px solid orange;
  border-bottom: 2px solid orange;
  display: flex;
  flex-direction: column;
}
</style>
