<template>
  <div>
    <MetersPanel
      v-if="settingsStore.showLuMeter || settingsStore.showPeakMeter"
    />
    <PlaylistToolBar />
    <div class="row">
      <div class="rightPanel" v-if="settingsStore.faderIsOtherSide">
        <PlaylistRightPanel />
      </div>
      <div
        v-if="soundsStore.playerMode === 'playlist'"
        class="column"
        style="min-width: 85%; max-width: 85%"
      >
        <SoundPlayList />
      </div>
      <div
        v-if="soundsStore.playerMode === 'cart'"
        class="column"
        style="min-width: 85%; max-width: 85%"
      >
        <CartScreen />
      </div>
      <div class="rightPanel" v-if="!settingsStore.faderIsOtherSide">
        <PlaylistRightPanel />
      </div>
    </div>

    <PlaylistFooter v-if="soundsStore.playerMode === 'playlist'" />
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from 'src/stores/settings-store';
import { useSoundsStore } from 'src/stores/sounds-store';

import PlaylistFooter from './PlaylistFooter.vue';
import PlaylistToolBar from './PlaylistToolBar.vue';
import PlaylistRightPanel from './PlaylistRightPanel.vue';
import SoundPlayList from './SoundPlayList.vue';
import MetersPanel from './MetersPanel.vue';
import CartScreen from './CartScreen.vue';

const settingsStore = useSettingsStore();
const soundsStore = useSoundsStore();
</script>

<style scoped>
.rightPanel {
  width: 15%;
  justify-content: center;
  align-items: center;
}
</style>
