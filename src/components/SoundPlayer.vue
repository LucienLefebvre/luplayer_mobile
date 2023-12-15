<template>
  <div class="player-container">
    <q-card
      class="soundBackground shadow-10"
      :style="{
        width: '100%',
        borderColor: isSelectedSound(sound) ? 'yellow' : getWaveformColor(),

        borderWidth: '2px',
        backgroundColor: getBackgroundColor(0.1),
      }"
      @click="soundTouchUp(sound)"
      @contextmenu.prevent
      ref="playerCard"
    >
      <!--   v-touch-hold="(e: TouchHold) => touchHold(sound)" -->
      <div class="column d-flex flex-center" style="width: 100%">
        <q-circular-progress
          v-if="!sound.waveformChunks"
          indeterminate
          rounded
          :size="75 * settingsStore.playlistWaveformHeightFactor + 'px'"
          :style="{
            height: settingsStore.playlistWaveformHeightFactor * 100 + 'px',
            color: getWaveformColor(),
          }"
        />
        <sound-waveform
          v-show="
            settingsStore.playlistWaveformHeightFactor > 0.1 &&
            sound.waveformChunks
          "
          ref="soundWaveforms"
          :sound="sound"
          style="width: 100%"
        />
        <div
          class="bottom-row row"
          :style="{
            color: getWaveformColor(),
            fontSize: getSoundNameHeight() + 'px',
            userSelect: 'none',
          }"
          ref="soundPlayer"
        >
          <sound-progress-bar
            :sound="sound"
            :style="{
              width: '100%',
              height: '100%',
            }"
            class="sound-progress-bar"
            ref="progressBar"
          />
          <div v-if="isPlaylistSound(sound)" class="sound-index">
            {{ getSoundIndex() }}
          </div>
          <div class="sound-name">{{ props.sound.name }}</div>
          <div class="sound-duration">
            {{ getSoundDurationLabel($props.sound) }}
          </div>
        </div>
      </div>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { PropType, ref, onMounted, Ref, watch } from 'vue';
import { SoundModel } from './models';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';
import SoundWaveform from './SoundWaveform.vue';
import SoundProgressBar from './SoundProgressBar.vue';
import {
  playOrStopSound,
  getSoundDurationLabel,
  setSelectedSound,
  getRemainingTime,
  findSoundArray,
  isCartSound,
  isPlaylistSound,
  isPlaylistActiveSound,
  setPlaylistActiveSound,
  isSelectedSound,
} from 'src/composables/sound-controller';
import { getCssVar, colors, is } from 'quasar';
import { onLongPress } from '@vueuse/core';
import { settings } from 'cluster';
const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});
const sound = ref(props.sound);
const soundWaveforms = ref<typeof SoundWaveform | null>(null);

const backgroundColor = ref('rgb(40, 134, 189)');

function getWaveformColor() {
  if (sound.value.isPlaying) {
    if (getRemainingTime(sound.value) < 5) return 'red';
    else return 'green';
  } else if (isPlaylistActiveSound(sound.value)) {
    return getCssVar('secondary') ?? 'orange';
  } else {
    return sound.value.color ?? 'blue';
  }
}
function getColorFromRGB(
  rgbColor: { r: number; g: number; b: number },
  opacity: number
) {
  const hexColor = colors.rgbToHex(rgbColor);
  return colors.changeAlpha(hexColor, opacity);
}

function getBackgroundColor(opacity: number) {
  let color;
  if (sound.value.isPlaying) {
    const rgbColor =
      getRemainingTime(sound.value) < 5
        ? { r: 255, g: 0, b: 0 }
        : { r: 93, g: 175, b: 77 };
    color = getColorFromRGB(rgbColor, opacity);
  } else if (
    isPlaylistActiveSound(sound.value) &&
    isPlaylistSound(sound.value)
  ) {
    const rgbColor = { r: 247, g: 151, b: 0 };
    color = getColorFromRGB(rgbColor, opacity);
  } else {
    color = colors.changeAlpha(sound.value.color, opacity);
  }
  backgroundColor.value = color;
  return color;
}

const soundOffset = ref(0);
let isTouchPanned = false;

function soundTouchUp(soundModel: SoundModel) {
  if (!soundsStore.isReordering && !isTouchPanned) {
    soundClicked(soundModel);
  }

  if (soundOffset.value > window.innerWidth / 2) {
    soundsStore.deleteSound(sound.value);
  }
  soundOffset.value = 0;

  isTouchPanned = false;
}

function soundClicked(sound: SoundModel) {
  if (isCartSound(sound)) {
    playOrStopSound(sound, false);
  } else if (isPlaylistSound(sound)) {
    setPlaylistActiveSound(sound, true);
  }
}

const playerCard = ref<HTMLElement | null>(null);
const longPressed = ref(false);

function onLongPressCallback(e: PointerEvent) {
  if (!soundsStore.isReordering) {
    longPressed.value = true;
    setSelectedSound(props.sound);
  }
}

function reset() {
  longPressed.value = false;
}

onLongPress(playerCard, onLongPressCallback, { delay: 800 });

const touchHold = ($e: Event, sound: SoundModel) => {
  $e.preventDefault();
};

function showEditWindow(sound: SoundModel) {
  soundsStore.editedSound = sound;
  soundsStore.showEditWindow = true;
  console.log('touchHold');
}

function getSoundIndex() {
  const array = findSoundArray(sound.value);
  if (array === null) return 0;
  return array.indexOf(sound.value) + 1;
}

const soundPlayer: Ref<HTMLElement | null> = ref(null);
const progressBar = ref<typeof SoundProgressBar | null>(null);
const barWidth = ref(0);
onMounted(() => {
  if (soundPlayer.value) {
    barWidth.value = soundPlayer.value.offsetWidth;
    progressBar.value?.setBarColor(getBackgroundColor(0.2));
  }
});

watch(
  () => backgroundColor.value,
  () => {
    progressBar.value?.setBarColor(getBackgroundColor(0.2));
  }
);

function getWaveformHeight() {
  if (!settingsStore.cartIsDifferentHeightThanPlaylist) {
    return settingsStore.playlistWaveformHeightFactor * 100;
  } else {
    return isCartSound(sound.value)
      ? settingsStore.cartWaveformHeightFactor * 100
      : settingsStore.playlistWaveformHeightFactor * 100;
  }
}

function getSoundNameHeight() {
  if (!settingsStore.cartIsDifferentHeightThanPlaylist) {
    return settingsStore.playlistSoundNameHeightFactor * 20;
  } else {
    return isCartSound(sound.value)
      ? settingsStore.cartSoundNameHeightFactor * 20
      : settingsStore.playlistSoundNameHeightFactor * 20;
  }
}

function shouldShowWaveform() {
  if (!settingsStore.cartIsDifferentHeightThanPlaylist) {
    return (
      settingsStore.playlistWaveformHeightFactor > 0.1 &&
      sound.value.waveformChunks
    );
  } else {
    return (
      (isCartSound(sound.value)
        ? settingsStore.cartWaveformHeightFactor
        : settingsStore.playlistWaveformHeightFactor) > 0.1 &&
      sound.value.waveformChunks
    );
  }
}
</script>

<style scoped>
.player-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;

  align-items: center;
}
.soundBackground {
  border: 1px solid;
  border-radius: 10px;
  border-color: orange;
  background-color: var(--bkgColor);
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
  max-width: 85vw;
  overflow: hidden;
}
.bottom-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: space-between;
  width: 100%;
  max-width: 100%;
  font-size: 16px;
  gap: 5px;
}
.sound-progress-bar {
  position: absolute;
  z-index: 1;
}
.sound-name {
  text-align: center;
  width: 70%;
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
  z-index: 2;
}
.sound-index {
  text-align: center;
  color: yellow;
  background-color: rgba(255, 255, 0, 0.1);
  width: 20px;
  border-top-right-radius: 5px;
  border-bottom-left-radius: 10px;

  position: relative;
  z-index: 2;
}
.sound-duration {
  text-align: center;
  width: 15%;
  color: yellow;
  background-color: rgba(255, 255, 0, 0.1);
  border-top-left-radius: 5px;
  border-bottom-right-radius: 10px;
  position: relative;
  z-index: 2;
}
</style>
