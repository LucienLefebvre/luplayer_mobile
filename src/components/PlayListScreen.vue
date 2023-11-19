<template>
  <MetersPanel
    v-if="settingsStore.showLuMeter || settingsStore.showPeakMeter"
  />
  <div class="row">
    <div class="rightPanel" v-if="settingsStore.faderIsOtherSide">
      <PlaylistRightPanel />
    </div>
    <div class="column" style="min-width: 85%; max-width: 85%">
      <SoundPlayList />
    </div>
    <div class="rightPanel" v-if="!settingsStore.faderIsOtherSide">
      <PlaylistRightPanel />
    </div>
  </div>

  <PlaylistFooter />
</template>

<script setup lang="ts">
import { useSettingsStore } from 'src/stores/settings-store';

import PlaylistFooter from './PlaylistFooter.vue';
import PlaylistRightPanel from './PlaylistRightPanel.vue';
import SoundPlayList from './SoundPlayList.vue';
import MetersPanel from './MetersPanel.vue';

const settingsStore = useSettingsStore();
</script>

<style scoped>
.rightPanel {
  width: 15%;
  justify-content: center;
  align-items: center;
}
</style>
