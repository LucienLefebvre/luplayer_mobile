<template>
  <div
    class="scrollable-playlist"
    :style="{ height: scrollablePlaylistHeight + 'px' }"
  >
    <div
      v-for="sound in soundsStore.sounds[0]"
      :key="sound.id"
      class="sound-player"
    >
      <SoundPlayer :sound="sound" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref, onMounted } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';

import SoundPlayer from './SoundPlayer.vue';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

watch(
  () => settingsStore.showPeakMeter,
  () => {
    updateHeight();
  }
);

watch(
  () => settingsStore.showLuMeter,
  () => {
    updateHeight();
  }
);

onMounted(() => {
  updateHeight();
});
const scrollablePlaylistHeight = ref(0);
const updateHeight = () => {
  console.log('updateHeight');
  let heightToSubtract = 155;
  const meterHeight = 31;
  if (settingsStore.showPeakMeter) {
    heightToSubtract += meterHeight;
  }
  if (settingsStore.showLuMeter) {
    heightToSubtract += meterHeight;
  }
  console.log('heightToSubtract', heightToSubtract);
  console.log('window.innerHeight', window.innerHeight);
  scrollablePlaylistHeight.value = window.innerHeight - heightToSubtract;
};
</script>

<style scoped>
.scrollable-playlist {
  height: calc(100vh - 215px);
  overflow-y: auto;
  gap: 10px;
}
.sound-player {
  padding-top: 2px;
  padding-bottom: 5px;
  padding-left: 3px;
  margin: 3px;
  font-size: 15px;
}
</style>
