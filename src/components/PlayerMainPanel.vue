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
      <div v-if="soundsStore.playerMode === 'playlist'" class="playlist">
        <SoundPlayList />
      </div>
      <div
        v-if="soundsStore.playerMode === 'cart'"
        style="min-width: 100%; max-width: 100%"
      >
        <SoundCart />
      </div>
      <div
        class="rightPanel"
        v-if="
          !settingsStore.faderIsOtherSide &&
          soundsStore.playerMode === 'playlist'
        "
      >
        <PlaylistRightPanel />
      </div>
    </div>

    <PlaylistFooter
      v-if="
        soundsStore.playerMode === 'playlist' ||
        soundsStore.playerMode === 'playlistAndCart'
      "
    />
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
import SoundCart from './SoundCart.vue';
import SoundPlaylistAndCart from './SoundPlaylistAndCart.vue';

const settingsStore = useSettingsStore();
const soundsStore = useSoundsStore();
</script>

<style scoped>
.rightPanel {
  width: 15%;
  justify-content: center;
  align-items: center;
}
.playlist {
  min-width: 85%;
  max-width: 85%;
}
</style>
