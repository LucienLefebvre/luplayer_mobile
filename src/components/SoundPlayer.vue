<template>
  <q-card
    class="soundBackground"
    style="width: 100%"
    :style="{
      borderColor: getWaveformColor(),
      transform: 'translate(' + soundOffset + 'px, 0px)',
      transition: isTouchPanned ? 'none' : 'transform 0.5s',
    }"
    v-touch-pan.mouse="moveSound"
    v-touch-hold="(e: TouchHold) => touchHold(e, sound)"
    @click="(e: Event) => soundTouchUp(sound)"
    @dblclick="soundDoubleClicked(sound)"
    @touchend="soundTouchUp(sound)"
  >
    <div class="column d-flex flex-center" style="width: 100%">
      <sound-waveform ref="soundWaveforms" :sound="sound" style="width: 100%" />
      <div class="sound-player row" :style="{ color: getWaveformColor() }">
        <div class="sound-name">{{ props.sound.name }}</div>
        <div class="sound-duration">
          {{ getSoundDurationLabel() }}
        </div>
      </div>
    </div>
  </q-card>

  <q-dialog v-model="soundsStore.showEditWindow">
    <div class="column fit" style="align-items: center; width: 100%">
      <sound-details :sound="soundsStore.editedSound!" />
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { PropType, ref } from 'vue';
import { SoundModel } from './models';
import { TouchHold } from 'quasar';
import { useSoundsStore } from '../stores/sounds-store';
import SoundDetails from './SoundDetails.vue';
import SoundWaveform from './SoundWaveform.vue';
import { lerpRGBAColor } from 'src/composables/color-helpers';
import { playStopSound } from 'src/composables/sound-controller';

const soundsStore = useSoundsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});

const sound = ref(props.sound);

const soundWaveforms = ref<typeof SoundWaveform | null>(null);

function getWaveformColor() {
  if (sound.value.isPlaying) {
    if (redAmount === 0) {
      soundWaveforms.value?.setWaveformColor('orange');
      if (sound.value.remainingTime < 5) return 'red';
      else return 'green';
    } else {
      let color = lerpRGBAColor([0, 255, 0, 1], [255, 0, 0, 1], redAmount);
      soundWaveforms.value?.setWaveformColor(color);
      return color;
    }
  } else if (sound.value.isSelected && soundsStore.playerMode === 'playlist') {
    if (redAmount === 0) {
      soundWaveforms.value?.setWaveformColor('orange');
      return 'orange';
    } else {
      let color = lerpRGBAColor([255, 165, 0, 1], [255, 0, 0, 1], redAmount);
      soundWaveforms.value?.setWaveformColor(color);
      return color;
    }
  } else {
    if (redAmount === 0) {
      soundWaveforms.value?.setWaveformColor('rgb(40, 134, 189)');
      return 'rgb(40, 134, 189)';
    } else {
      let color = lerpRGBAColor([40, 134, 189, 1], [255, 0, 0, 1], redAmount);
      soundWaveforms.value?.setWaveformColor(color);
      return color;
    }
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
}

function getSoundDurationLabel() {
  if (sound.value.isPlaying) {
    return sound.value.remainingTime.toFixed(0);
  } else return sound.value.duration.toFixed(0);
}
const editWindow = ref(false);
</script>

<style scoped>
.soundBackground {
  border: 1px solid;
  border-radius: 10px;
  border-color: 'orange';
  background-color: var(--bkgColor);
}

.sound-player {
  display: flex;
  flex-direction: row;
  width: 100%;
  max-width: 250px;
  font-size: 16px;
}

.sound-name {
  text-align: left;
  width: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sound-duration {
  text-align: right;
  width: 20%;
}
</style>
