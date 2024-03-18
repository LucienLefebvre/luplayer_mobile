<template>
  <div ref="touchZone" class="touch-zone" @touchmove.prevent>
    <q-icon name="drag_handle" size="20px" color="primary" />
  </div>
</template>

<script setup lang="ts">
import { SoundModel } from './models';
import { ref, PropType } from 'vue';
import { useSoundsStore } from 'src/stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';
import {
  setSelectedSound,
  setSoundVolumeDB,
} from 'src/scripts/sound-controller';
import { set, useSwipe } from '@vueuse/core';
import type { SwipeDirection } from '@vueuse/core';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});
const sound = ref(props.sound);
const touchZone = ref<HTMLElement | null>(null);

let swipeStartGain = sound.value.volumeDb;
let timeOut: ReturnType<typeof setTimeout>;

const { direction, isSwiping, lengthX, lengthY } = useSwipe(touchZone, {
  threshold: 5,
  passive: true,
  onSwipeStart(e: TouchEvent) {
    swipeStartGain = sound.value.volumeDb;
    sound.value.shouldShowVolume = true;
    setSelectedSound(sound.value, false);
    launchTimeout();
  },
  onSwipe(e: TouchEvent) {
    clearTimeout(timeOut);
    if (direction.value === 'UP' || direction.value === 'DOWN') {
      let gain =
        swipeStartGain +
        (lengthY.value / 20) * settingsStore.cartVolumeSwipeMultiplier;
      gain = Math.min(12, Math.max(-60, gain));
      setSoundVolumeDB(sound.value, gain);
    }
  },
  onSwipeEnd(e: TouchEvent, direction: SwipeDirection) {
    launchTimeout();
  },
});

function launchTimeout() {
  timeOut = setTimeout(() => {
    sound.value.shouldShowVolume = false;
  }, 1000);
}
</script>

<style scoped>
.touch-zone {
  width: 100%;
  height: 100%;
  background-color: rgba(255, 166, 0, 0.63);
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  box-shadow: 2px 2px 7px 3px rgba(0, 0, 0, 0.3);
}
</style>
