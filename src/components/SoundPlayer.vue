<template>
  <q-card
    class="soundBackground shadow-10"
    style="width: 100%"
    :style="{
      borderColor: getWaveformColor(),
      transform: 'translate(' + soundOffset + 'px, 0px)',
      transition: isTouchPanned ? 'none' : 'transform 0.5s',
      backgroundColor: getBackgroundColor(0.1),
    }"
    v-touch-pan.mouse="moveSound"
    v-touch-hold="(e: TouchHold) => touchHold(e, sound)"
    @click="(e: Event) => soundTouchUp(sound)"
    @dblclick="soundDoubleClicked(sound)"
    @touchend="soundTouchUp(sound)"
  >
    <div class="column d-flex flex-center" style="width: 100%">
      <sound-waveform
        v-if="settingsStore.playerHeightFactor > 0.1"
        ref="soundWaveforms"
        :sound="sound"
        style="width: 100%"
      />
      <div class="sound-player row" :style="{ color: getWaveformColor() }">
        <div class="sound-index">{{ getSoundIndex() }}</div>
        <div class="sound-name">{{ props.sound.name }}</div>
        <div class="sound-duration">
          {{ getSoundDurationLabel($props.sound) }}
        </div>
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { PropType, ref } from 'vue';
import { SoundModel } from './models';
import { TouchHold } from 'quasar';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';
import SoundWaveform from './SoundWaveform.vue';
import {
  playStopSound,
  getSoundDurationLabel,
} from 'src/composables/sound-controller';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});

const sound = ref(props.sound);

const soundWaveforms = ref<typeof SoundWaveform | null>(null);

function getWaveformColor() {
  if (sound.value.isPlaying) {
    soundWaveforms.value?.setWaveformColor('orange');
    if (sound.value.remainingTime < 5) return 'red';
    else return 'green';
  } else if (sound.value.isSelected && soundsStore.playerMode === 'playlist') {
    soundWaveforms.value?.setWaveformColor('orange');
    return 'orange';
  } else {
    soundWaveforms.value?.setWaveformColor('rgb(40, 134, 189)');
    return 'rgb(40, 134, 189)';
  }
}

function getBackgroundColor(opacity: number) {
  if (sound.value.isPlaying) {
    if (sound.value.remainingTime < 5)
      return 'rgba(255, 0, 0, ' + opacity + ')';
    else return 'rgba(93, 175, 77 , ' + opacity + ')';
  } else if (sound.value.isSelected && soundsStore.playerMode === 'playlist') {
    return 'rgba(247, 151, 0 , ' + opacity + ')';
  } else {
    return 'rgb(40, 134, 189, ' + opacity + ')';
  }
}

const soundOffset = ref(0);
let isTouchPanned = false;
let redAmount = 0;
function moveSound(e: any) {
  isTouchPanned = true;
  if (sound.value.isPlaying) return;
  if (soundsStore.isReordering) return;
  const deltaY = 25;
  const ySwipe = Math.max(0, e.offset.x - deltaY);

  if (ySwipe > deltaY) {
    soundOffset.value = ySwipe - deltaY;
    redAmount = (soundOffset.value / window.innerWidth) * 3;
    soundWaveforms.value?.setRedAmount(redAmount);
  }
}

function soundTouchUp(soundModel: SoundModel) {
  if (!soundsStore.isReordering && !isTouchPanned) {
    soundClicked(soundModel);
  }

  if (soundOffset.value > window.innerWidth / 2) {
    soundsStore.deleteSound(sound.value);
  }
  soundOffset.value = 0;
  redAmount = 0;

  isTouchPanned = false;
}

function soundClicked(sound: SoundModel) {
  if (!soundsStore.isReordering && soundsStore.playerMode === 'playlist') {
    soundsStore.setSelectedSound(sound);
  } else if (soundsStore.playerMode === 'cart') {
    playStopSound(sound);
  }
}

function soundDoubleClicked(sound: SoundModel) {
  showEditWindow(sound);
}

function touchHold(e: TouchHold, sound: SoundModel) {
  showEditWindow(sound);
}

function showEditWindow(sound: SoundModel) {
  soundsStore.editedSound = sound;
  soundsStore.showEditWindow = true;
  console.log('touchHold');
}

function getSoundIndex() {
  return soundsStore.sounds[0].indexOf(sound.value) + 1;
}
</script>

<style scoped>
.soundBackground {
  border: 1px solid;
  border-radius: 10px;
  border-color: orange;
  background-color: var(--bkgColor);
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
}
.sound-player {
  display: flex;
  flex-direction: row;
  width: 100%;
  font-size: 16px;
  max-width: 80vw;
  padding-left: 5px;
  gap: 5px;
}

.sound-name {
  text-align: center;
  width: 70%;
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sound-index {
  text-align: center;
  color: yellow;
  background-color: rgba(255, 255, 0, 0.1);
  width: 20px;
  border-top-right-radius: 5px;
  border-top-left-radius: 5px;
}
.sound-duration {
  text-align: center;
  width: 15%;
  color: yellow;
  background-color: rgba(255, 255, 0, 0.1);
  border-top-right-radius: 5px;
  border-top-left-radius: 5px;
}
</style>
