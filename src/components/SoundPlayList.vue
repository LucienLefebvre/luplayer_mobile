<template>
  <div
    class="scrollable-playlist"
    :style="{ height: scrollablePlaylistHeight + 'px' }"
    ref="soundPlayers"
  >
    <TransitionGroup name="players" id="listElements" tag="div">
      <div
        v-for="sound in soundsStore.playlistSounds"
        :key="sound.id"
        class="sound-player"
        :id="sound.id"
      >
        <SoundPlayer :sound="sound" :id="sound.id" :key="sound.id" />
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { watch, ref, onMounted, Ref, nextTick } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';

import Sortable from 'sortablejs';
import gsap from 'gsap';
import SoundPlayer from './SoundPlayer.vue';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const soundPlayers: Ref<HTMLElement | null> = ref(null);
const soundPlayerRefs = ref([]);

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
  if (soundsStore.playerMode === 'playlistAndCart') {
    heightToSubtract += settingsStore.playlistAndCartCartSize;
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
  () => soundsStore.playlistActiveSound,
  () => {
    if (settingsStore.autoScroll && soundsStore.playlistActiveSound) {
      const selectedSoundIndex = soundsStore.playlistSounds.indexOf(
        soundsStore.playlistActiveSound
      );

      if (soundPlayers.value === null) return;
      soundPlayers.value.scrollTo({
        top:
          (36 + 100 * settingsStore.playlistWaveformHeightFactor) *
          selectedSoundIndex,
        behavior: 'smooth',
      });
    }
  }
);

watch(
  () => settingsStore.playlistAndCartCartSize,
  () => {
    updateHeight();
  }
);

let elements: HTMLElement | null = null;
let sortable: Sortable;

onMounted(() => {
  elements = document.getElementById('listElements');
  if (!elements) return;

  sortable = Sortable.create(elements!, {
    animation: 150,
    ghostClass: 'ghost',
    dragClass: 'dragging',
    sort: true,
    onEnd: (evt) => {
      dragEnd(evt);
    },
  });
  sortable.option('disabled', !soundsStore.isReordering);
});

function dragEnd(evt: Sortable.SortableEvent) {
  const oldIndex = evt.oldIndex;
  const newIndex = evt.newIndex;

  console.log('dragEnd', oldIndex, newIndex);

  if (oldIndex === newIndex) return;
  if (oldIndex === undefined || newIndex === undefined) return;
  soundsStore.playlistSounds.splice(
    newIndex,
    0,
    soundsStore.playlistSounds.splice(oldIndex, 1)[0]
  );

  if (soundsStore.reorderLocked) return;
  if (soundsStore.isReordering) {
    soundsStore.isReordering = false;
  }
}

watch(
  () => soundsStore.isReordering,
  () => {
    if (!sortable) return;
    sortable.option('disabled', !soundsStore.isReordering);
  }
);

onMounted(() => {
  updateHeight();
});
</script>

<style scoped>
@import 'src/css/players-transitions.css';

.scrollable-playlist {
  overflow-y: auto;
  gap: 10px;
}

.sound-player {
  padding-top: 2px;
  padding-bottom: 5px;
  margin: 3px;
  font-size: 15px;
}
</style>
