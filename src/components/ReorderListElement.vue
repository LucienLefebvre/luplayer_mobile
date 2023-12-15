<template>
  <div class="element-row" :style="{ color: getSoundColor() }">
    <div v-if="soundsStore.playerMode === 'playlist'" class="sound-index">
      {{ getSoundIndex() }}
    </div>
    <!--   <q-btn
      flat
      dense
      :icon="sound.isPlaying ? 'pause' : 'play_arrow'"
      class="left-buttons"
      size="sm"
      @touchend="playOrStopSound(sound)"
    /> -->
    <div class="sound-name">{{ sound.name }}</div>
    <!--   <div class="sound-duration">
      {{ getSoundDurationLabel() }}
    </div> -->
    <q-btn
      flat
      dense
      icon="delete"
      color="red"
      class="left-buttons"
      size="sm"
      @touchend="soundsStore.deleteSound(sound)"
    />
  </div>
</template>

<script setup lang="ts">
import { PropType, ref } from 'vue';
import { SoundModel } from './models';
import { useSoundsStore } from '../stores/sounds-store';
import {
  getRemainingTime,
  playOrStopSound,
} from 'src/composables/sound-controller';
import { getMMSSfromS } from 'src/composables/math-helpers';

const soundsStore = useSoundsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});

const sound = ref(props.sound);

function getSoundIndex() {
  return soundsStore.playlistSounds.indexOf(sound.value) + 1;
}

function getSoundColor() {
  if (props.sound.isPlaying) {
    return 'green';
  } else {
    return 'orange';
  }
}

function getSoundDurationLabel() {
  return getMMSSfromS(getRemainingTime(sound.value));
}
</script>

<style scoped>
.element-row {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  padding: 10px;
  font-size: 15px;
  max-width: 100%;
  border: 2px solid;
  border-color: var(--blueColor);
  border-radius: 10px;
}
.left-buttons {
  width: 5%;
  max-width: 5%;
}
.sound-name {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  width: 70%;
  max-width: 70%;
}
.sound-index {
  color: yellow;
}
</style>
