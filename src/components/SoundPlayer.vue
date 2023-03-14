<template>
  <q-card
    class="soundBackground"
    style="width: 100%"
    :style="{
      borderColor: getWaveformColor(),
      transform: 'translate(' + soundOffset + 'px, 0px)',
      transition: isHorizontallyScrolled ? 'none' : 'transform 0.5s',
    }"
    v-touch-pan.mouse="moveSound"
    v-touch-hold="(e: TouchHold) => touchHold(e, sound)"
    @click="(e: Event) => soundClicked(sound)"
    @dblclick="soundDoubleClicked(sound)"
    @touchend="soundTapped(sound, $event)"
  >
    <div class="column d-flex flex-center" style="width: 100%">
      <sound-waveform ref="soundWaveforms" :sound="sound" style="width: 100%" />
      <div class="soundName" :style="{ color: getWaveformColor() }">
        {{ props.sound.name }}
      </div>
    </div>
  </q-card>

  <q-dialog v-model="editWindow">
    <q-btn icon="close" color="white" flat round dense v-close-popup />
    <sound-details :sound="sound" />
  </q-dialog>
</template>

<script setup lang="ts">
import { PropType, ref, watch } from 'vue';
import { SoundModel } from './models';
import { TouchHold } from 'quasar';
import { useSoundsStore } from '../stores/sounds-store';
import SoundDetails from './SoundDetails.vue';
import SoundWaveform from './SoundWaveform.vue';
import { lerpRGBAColor } from 'src/composables/color-helpers';
import { playStopSound, playSound } from 'src/composables/sound-controller';

const soundsStore = useSoundsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: true },
});

const sound = ref(props.sound);

const soundWaveforms = ref<typeof SoundWaveform | null>(null);

function getWaveformColor() {
  if (sound.value.isPlaying) {
    if (redAmount === 0) {
      soundWaveforms.value?.setWaveformColor('green');
      return 'green';
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
let isHorizontallyScrolled = false;

let redAmount = 0;
function moveSound(e: any) {
  if (sound.value.isPlaying) return;
  if (soundsStore.isReordering) return;
  const deltaY = 25;
  const ySwipe = Math.max(0, e.offset.x - deltaY);

  if (ySwipe > deltaY) {
    soundOffset.value = ySwipe - deltaY;
    isHorizontallyScrolled = true;
    redAmount = (soundOffset.value / window.innerWidth) * 3;
    soundWaveforms.value?.setRedAmount(redAmount);
  }
}

let scrolled = false;

function soundTapped(soundModel: SoundModel, e: TouchEvent) {
  if (!soundsStore.isReordering && !scrolled && !isHorizontallyScrolled) {
    soundClicked(soundModel);
  }
  scrolled = false;

  isHorizontallyScrolled = false;
  if (soundOffset.value > window.innerWidth / 2) {
    soundsStore.deleteSound(sound.value);
  }
  soundOffset.value = 0;
  redAmount = 0;
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

const editWindow = ref(false);
</script>

<style scoped>
.soundBackground {
  border: 1px solid;
  border-radius: 10px;
  border-color: 'orange';
  background-color: var(--bkgColor);
}
.soundName {
  max-width: 150px;
  text-align: center;
  font-size: 1rem;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
