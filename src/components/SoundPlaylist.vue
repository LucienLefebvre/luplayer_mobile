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
      :id="sound.id"
    >
      <SoundPlayer :sound="sound" :id="sound.id" />
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

const scrollablePlaylistHeight = ref(0);
const updateHeight = () => {
  let heightToSubtract = 205;
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
        top:
          (36 + 100 * settingsStore.waveformHeightFactor) * selectedSoundIndex,
        behavior: 'smooth',
      });
    }
  }
);

onMounted(() => {
  updateHeight();
});

const soundPlayersInViewport = ref<string[]>([]);
const elementsObserved: HTMLElement[] = [];
watch(
  () => soundsStore.sounds[0].length,
  () => {
    console.log('sounds changed');
    const options: IntersectionObserverInit = {
      root: null,
      rootMargin: '400px',
      threshold: 0,
    };

    soundsStore.sounds[0].forEach((sound) => {
      const element = document.getElementById(sound.id);
      if (element && !elementsObserved.includes(element)) {
        elementsObserved.push(element);
        const observer = new IntersectionObserver(handleIntersection, options);
        //observer.observe(element);
      }
    });
  }
);

const handleIntersection = (entries: IntersectionObserverEntry[]) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const foundSound = soundsStore.sounds[0].find(
        (sound) => sound.id === entry.target.id
      );

      if (foundSound) {
        foundSound.displayWaveform = true;
      }
    } else {
      const foundSound = soundsStore.sounds[0].find(
        (sound) => sound.id === entry.target.id
      );

      if (foundSound) {
        foundSound.displayWaveform = false;
      }
    }
  });
};

const isSoundPlayerInViewport = (id: string) =>
  soundPlayersInViewport.value.includes(id);
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
