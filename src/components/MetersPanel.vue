<template>
  <div class="separator-div">
    <PeakMeter
      v-show="settingsStore.showPeakMeter"
      :analyserObject="soundsStore.outputAnalyserNodes"
      class="metersStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from '../stores/settings-store';
import PeakMeter from './PeakMeter.vue';

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
  display: flex;
  flex-direction: column;
}
</style>
