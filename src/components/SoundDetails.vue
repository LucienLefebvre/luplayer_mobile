<template>
  <q-card class="soundDetailsBackground">
    <div class="column q-pa-md justify-center">
      <q-btn
        @click="soundsStore.showEditWindow = false"
        icon="close"
        color="white"
        flat
        round
        dense
        size="20px"
      />
      <div class="soundName" :style="{ color: getWaveformColor() }">
        {{ sound.name }}
      </div>
      <div style="height: 10px"></div>
      <div class="row">
        <div class="column d-flex flex-center" style="width: 40%">
          <q-slider
            vertical
            reverse
            label
            :label-value="sound.trimGain + 'dB'"
            label-always
            v-model="sound.trimGain"
            @update:model-value="setTrimGain(sound, $event!)"
            :min="-24"
            :max="24"
            :step="0.1"
            track-size="8px"
            thumb-size="25px"
            color="orange"
          />
        </div>
        <div class="column d-flex flex-center q-py-md" style="width: 60%">
          <q-btn
            class="justify-center"
            style="background-color: var(--blueColor); width: 60%"
            label="normalize"
            @click="normalizeSound(sound)"
          />
          <q-btn
            label="HPF"
            @click="toggleHpf(sound)"
            style="width: 60%"
            :color="getHpfButtonColor()"
          />
          <q-slider
            v-model="sound.hpfFrequency"
            :min="20"
            :max="200"
            style="width: 60%; margin-top: 10px"
            :label-value="sound.hpfFrequency + 'Hz'"
            label-always
            switch-label-side
            @update:model-value="setHpfFrequency(sound, $event!)"
          />
        </div>
      </div>
      <div style="height: 10px"></div>
      <sound-waveform
        ref="soundWaveforms"
        :sound="sound"
        :is-sound-details="true"
        style="width: 100%"
        @is-max-zoomed="setIsMaxZoomed($event)"
        @is-min-zoomed="setIsMinZoomed($event)"
      />
      <div style="height: 10px"></div>
      <div class="row">
        <q-btn
          class="bottomButtons"
          label="-"
          @click="soundWaveforms?.zoomOut()"
          :disabled="isMinZoomed"
        />
        <q-btn
          class="bottomButtons"
          label="+"
          @click="soundWaveforms?.zoomIn()"
          :disabled="isMaxZoomed"
        />
      </div>
      <div style="height: 10px"></div>
      <div class="row">
        <q-btn
          class="bottomButtons"
          label="Set in"
          @click="setInTimeAtCurrentPosition(sound)"
        />
        <q-btn class="bottomButtons" label="-" @click="deleteInTime(sound)" />
        <q-btn
          class="bottomButtons"
          label="Set out"
          @click="setOutTimeAtCurrentPosition(sound)"
        />

        <q-btn class="bottomButtons" label="-" @click="deleteOutTime(sound)" />
      </div>
      <div style="height: 10px"></div>
      <div class="row">
        <q-btn
          :label="getPlayButtonLabel()"
          color="green"
          @click="playButtonClicked()"
        />
        <div style="height: 10px"></div>
        <q-btn
          label="delete"
          color="red"
          @click="soundsStore.deleteSound(sound)"
        />
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { PropType, ref, watch } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { SoundModel } from './models';
import SoundWaveform from './SoundWaveform.vue';
import { dbToGain } from '../composables/math-helpers';
import {
  deleteInTime,
  deleteOutTime,
  pauseSound,
  playSound,
  setInTimeAtCurrentPosition,
  setOutTimeAtCurrentPosition,
  setTrimGain,
  normalizeSound,
  toggleHpf,
  setHpfFrequency,
} from 'src/composables/sound-controller';
import { resolvePackageData } from 'vite';

const soundsStore = useSoundsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: false },
});

const sound = soundsStore.editedSound;
const soundWaveforms = ref<typeof SoundWaveform | null>(null);

function playButtonClicked() {
  if (sound?.audioElement.paused) {
    playSound(sound);
  } else {
    pauseSound(sound!);
  }
}

function getPlayButtonLabel() {
  if (sound?.audioElement.paused) {
    return 'play';
  } else {
    return 'pause';
  }
}
function getWaveformColor() {
  if (sound?.isPlaying) {
    return 'green';
  } else if (sound?.isSelected) {
    return 'orange';
  } else {
    return 'rgb(40, 134, 189)';
  }
}

function getHpfButtonColor() {
  if (sound?.hpfEnabled) {
    return 'green';
  } else {
    return 'var(--blueColor)';
  }
}
const isMaxZoomed = ref(false);
const isMinZoomed = ref(false);

function setIsMaxZoomed(e: boolean) {
  isMaxZoomed.value = e;
}

function setIsMinZoomed(e: boolean) {
  isMinZoomed.value = e;
}

interface SliderLabel {
  value: number;
  label: string;
}
const sliderLabelArray: SliderLabel[] = [
  { value: -24, label: '-24dB' },
  { value: 0, label: '0dB' },
  { value: 24, label: '24dB' },
];
</script>

<style scoped>
.soundName {
  max-width: 300px;
  text-align: center;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  widows: 100%;
}
.soundDetailsBackground {
  border: 1px solid;
  border-radius: 10px;
  border-color: 'orange';
  background-color: var(--bkgColor);
}
.bottomButtons {
  background-color: var(--blueColor);

  margin: 0px 10px;
}
</style>
