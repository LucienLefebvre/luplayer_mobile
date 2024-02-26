<template>
  <div class="player-container" ref="playerContainer">
    <q-card
      class="soundBackground shadow-10"
      :style="{
        width: '100%',
        borderColor: getBorderColor(),
        borderWidth: '2px',
        backgroundColor: getBackgroundColor(0.1),
        left: left + 'px',
        opacity,
      }"
      @click="soundTouchUp(sound)"
      @contextmenu.prevent
      ref="playerCard"
    >
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
          ref="nameBar"
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
          <div v-if="isCartSound(sound) && sound.isLooping" class="text-yellow">
            <q-icon name="loop" />
          </div>
          <div v-if="isCartSound(sound) && sound.retrigger" class="text-yellow">
            <q-icon name="start" />
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
import {
  PropType,
  ref,
  onMounted,
  Ref,
  watch,
  computed,
  onBeforeUnmount,
} from 'vue';
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
  playSound,
  stopSound,
} from 'src/composables/sound-controller';
import { getCssVar, colors, is } from 'quasar';
import { onLongPress, tryOnBeforeUnmount, useSwipe } from '@vueuse/core';
import type { SwipeDirection } from '@vueuse/core';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});
const sound = ref(props.sound);
const soundWaveforms = ref<typeof SoundWaveform | null>(null);

const backgroundColor = ref('rgb(40, 134, 189)');

let isTouchPanned = false;

const playerCard = ref<HTMLElement | null>(null);
const playerContainer = ref<HTMLElement | null>(null);
const containerWidth = computed(() => playerContainer.value?.offsetWidth);
let swipeActionThreshold = 100;
const left = ref('0');
const opacity = ref(1);

function getWaveformColor() {
  if (sound.value.isPlaying) {
    if (getRemainingTime(sound.value) < 5 && sound.value.isPlaying)
      return 'red';
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

function getBackgroundColor(opa: number) {
  let color;
  if (Number(left.value) > swipeActionThreshold) {
    color = 'red';
  } else if (sound.value.isPlaying) {
    const rgbColor =
      getRemainingTime(sound.value) < 5
        ? { r: 255, g: 0, b: 0 }
        : { r: 93, g: 175, b: 77 };
    color = getColorFromRGB(rgbColor, opa);
  } else if (isPlaylistActiveSound(sound.value)) {
    const rgbColor = { r: 247, g: 151, b: 0 };
    color = getColorFromRGB(rgbColor, opa);
  } else {
    color = colors.changeAlpha(sound.value.color, opa);
  }
  backgroundColor.value = color;
  return color;
}

function getBorderColor() {
  if (
    (soundsStore.playerMode === 'playlist' &&
      isPlaylistActiveSound(sound.value)) ||
    (soundsStore.playerMode === 'cart' && isSelectedSound(sound.value))
  )
    return 'yellow';
  else return getBackgroundColor(1);
}
let hasBeenScolled = false;

const { direction, isSwiping, lengthX, lengthY } = useSwipe(playerCard, {
  passive: true,
  threshold: 5,
  onSwipe(e: TouchEvent) {
    if (containerWidth.value && !soundsStore.isReordering) {
      if (!canSwipeSound(direction.value!)) return;
      if (
        direction.value === 'UP' ||
        direction.value === 'DOWN' ||
        direction.value === 'LEFT'
      ) {
        hasBeenScolled = true;
        return;
      }
      if (lengthX.value < 0 && !hasBeenScolled) {
        const length = Math.abs(lengthX.value);
        left.value = `${length}`;
        opacity.value = 1 - length / containerWidth.value;
      } else if (!hasBeenScolled) {
        const length = lengthX.value;
        left.value = `${-length}`;
      }
    }
  },
  onSwipeEnd(e: TouchEvent, direction: SwipeDirection) {
    if (soundsStore.isReordering) return;
    if (!canSwipeSound(direction)) return;
    if (hasBeenScolled) {
      hasBeenScolled = false;
    }
    if (
      direction === 'RIGHT' &&
      containerWidth.value &&
      Math.abs(lengthX.value) / containerWidth.value >= 0.5
    ) {
      if (!sound.value.audioElement.paused) {
        resetSwipe();
      }
      soundsStore.askForSoundDeletion(sound.value);
      resetSwipe();
    } else {
      resetSwipe();
    }
  },
});

function canSwipeSound(direction: SwipeDirection) {
  if (soundsStore.playerMode === 'cart' && !sound.value.isPlaying) return true;
  else if (
    soundsStore.playerMode === 'playlist' &&
    direction === 'RIGHT' &&
    sound.value.isPlaying
  )
    return false;
  else return true;
}
function resetSwipe() {
  left.value = '0';
  opacity.value = 1;
}

let timeOfLastClick = 0;

function soundTouchUp(soundModel: SoundModel) {
  const now = new Date().getTime();
  if (!soundsStore.isReordering && !isTouchPanned) {
    const isDoubleTap = now - timeOfLastClick < 300;

    if (isCartSound(soundModel)) {
      if (soundModel.retrigger) {
        stopSound(soundModel);
        playSound(soundModel, false, false);
        setSelectedSound(soundModel);
        return;
      }
      playOrStopSound(
        soundModel,
        false,
        isDoubleTap,
        settingsStore.selectLastPlayedCartSound
      );
    } else if (isPlaylistSound(soundModel)) {
      setPlaylistActiveSound(soundModel, true);
    }
  }

  isTouchPanned = false;
  timeOfLastClick = now;
}

const longPressed = ref(false);

function onLongPressCallback(e: PointerEvent) {
  if (!soundsStore.isReordering) {
    longPressed.value = true;
    if (sound.value.isPlaying && sound.value.retrigger) {
      stopSound(sound.value);
    }
    if (isPlaylistSound(sound.value)) {
      setPlaylistActiveSound(sound.value, true);
    } else {
      setSelectedSound(sound.value);
    }
  }
}

onLongPress(playerCard, onLongPressCallback, { delay: 500 });

function getSoundIndex() {
  const array = findSoundArray(sound.value);
  if (array === null) return 0;
  return array.indexOf(sound.value) + 1;
}

const nameBar: Ref<HTMLElement | null> = ref(null);
const progressBar = ref<typeof SoundProgressBar | null>(null);
const barWidth = ref(0);

onMounted(() => {
  if (nameBar.value) {
    barWidth.value = nameBar.value.offsetWidth;
    progressBar.value?.setBarColor(getBackgroundColor(0.2));
  }
  if (containerWidth.value) {
    swipeActionThreshold = containerWidth.value / 2;
  }
});

watch(
  () => backgroundColor.value,
  () => {
    progressBar.value?.setBarColor(getBackgroundColor(0.2));
  }
);

watch(
  () => sound.value.isPlaylistActiveSound,
  () => {
    getBackgroundColor(1);
  }
);

function getSoundNameHeight() {
  if (!settingsStore.cartIsDifferentHeightThanPlaylist) {
    return settingsStore.playlistSoundNameHeightFactor * 20;
  } else {
    return isCartSound(sound.value)
      ? settingsStore.cartSoundNameHeightFactor * 20
      : settingsStore.playlistSoundNameHeightFactor * 20;
  }
}

onBeforeUnmount(() => {
  soundWaveforms.value = null;
  playerCard.value = null;
  playerContainer.value = null;
  nameBar.value = null;
  progressBar.value = null;
});
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
  font-size: 1rem;
  gap: 5px;
}
.sound-progress-bar {
  position: absolute;
}
.sound-name {
  text-align: center;
  width: 70%;
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: relative;
}

.sound-index {
  text-align: center;
  color: yellow;
  background-color: rgba(255, 255, 0, 0.1);
  width: 20px;
  border-top-right-radius: 5px;
  border-bottom-left-radius: 10px;
  position: relative;
}
.sound-duration {
  text-align: center;
  width: 15%;
  color: yellow;
  background-color: rgba(255, 255, 0, 0.1);
  border-top-left-radius: 5px;
  border-bottom-right-radius: 10px;
  position: relative;
}
</style>
