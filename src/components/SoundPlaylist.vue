<template>
  <div
    class="scrollable-playlist"
    :style="{ height: scrollablePlaylistHeight + 'px' }"
    ref="soundPlayers"
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
import { watch, ref, onMounted, Ref } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';

import SoundPlayer from './SoundPlayer.vue';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const soundPlayers: Ref<HTMLElement | null> = ref(null);

onMounted(() => {
  updateHeight();
});

const scrollablePlaylistHeight = ref(0);
const updateHeight = () => {
  let heightToSubtract = 155;
  const meterHeight = 31;
  if (settingsStore.showPeakMeter) {
    heightToSubtract += meterHeight;
  }
  if (settingsStore.showLuMeter) {
    heightToSubtract += meterHeight;
  }
  scrollablePlaylistHeight.value = window.innerHeight - heightToSubtract;
};

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

watch(
  () => soundsStore.selectedSound,
  () => {
    if (settingsStore.autoScroll) {
      const selectedSoundIndex = soundsStore.sounds[0].indexOf(
        soundsStore.selectedSound!
      );

      if (soundPlayers.value === null) return;
      soundPlayers.value.scrollTo({
        top: (36 + 100 * settingsStore.playerHeightFactor) * selectedSoundIndex,
        behavior: 'smooth',
      });
    }
  }
);
</script>

<style scoped>
.scrollable-playlist {
  height: calc(100vh - 224px);
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
