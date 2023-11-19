<template>
  <div style="height: 5px"></div>
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
  padding-left: 5px;
  padding-right: 5px;
  padding-top: 2px;
}
</style>
