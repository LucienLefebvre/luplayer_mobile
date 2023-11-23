<template>
  <div class="column sound-details">
    <div class="close-button">
      <q-btn
        @click="closeButtonClicked()"
        icon="close"
        color="white"
        flat
        round
        dense
        size="20px"
      />
    </div>
    <q-card class="soundDetailsBackground">
      <div class="column q-pa-md justify-center">
        <div class="soundName" :style="{ color: getWaveformColor() }">
          {{ sound.name }}
        </div>
        <q-separator color="primary" class="separator" size="2px" />
        <div class="row volume-container">
          <q-btn
            class="justify-center normalize-button"
            label="0LU"
            @click="normalizeSound(sound, settingsStore.normalizationLuTarget)"
          />
          <q-slider
            label
            :label-value="sound.trimGain + 'dB'"
            label-always
            switch-label-side
            v-model="sound.trimGain"
            @update:model-value="setTrimGain(sound, $event!)"
            :min="-24"
            :max="24"
            :step="0.1"
            track-size="4px"
            thumb-size="20px"
            color="orange"
            class="volume-slider"
          />
        </div>
        <div class="row filter-container">
          <q-btn
            label="HPF"
            @click="toggleHpf(sound)"
            class="filter-button"
            :color="getHpfButtonColor()"
          />
          <q-slider
            v-model="sound.hpfFrequency"
            :min="20"
            :max="200"
            class="filter-slider"
            :label-value="sound.hpfFrequency + 'Hz'"
            label-always
            switch-label-side
            @update:model-value="setHpfFrequency(sound, $event!)"
            track-size="4px"
            thumb-size="20px"
            color="orange"
          />
        </div>
        <q-separator color="primary" class="separator" size="2px" />
        <div class="in-out-buttons">
          <div>
            <q-btn
              label="In"
              @click="setInTimeAtCurrentPosition(sound)"
              class="set-mark-button"
              size="sm"
            />
            <q-btn
              icon="delete"
              @click="deleteInTime(sound)"
              class="delete-mark-button"
              size="sm"
            />
          </div>
          <div>
            <q-btn
              label="Out"
              @click="setOutTimeAtCurrentPosition(sound)"
              class="set-mark-button"
              size="sm"
            />
            <q-btn
              icon="delete"
              @click="deleteOutTime(sound)"
              class="delete-mark-button"
              size="sm"
            />
          </div>
        </div>
        <sound-waveform
          ref="soundWaveforms"
          :sound="sound"
          :is-sound-details="true"
          style="width: 100%"
          @is-max-zoomed="setIsMaxZoomed($event)"
          @is-min-zoomed="setIsMinZoomed($event)"
        />
        <div style="height: 10px"></div>
        <div class="zoom-buttons">
          <q-btn
            label="-"
            @click="soundWaveforms?.zoomOut()"
            :disabled="isMinZoomed"
            size="sm"
            class="zoom-button"
          />
          <q-btn
            label="+"
            @click="soundWaveforms?.zoomIn()"
            :disabled="isMaxZoomed"
            size="sm"
            class="zoom-button"
          />
        </div>

        <q-separator color="primary" class="separator" size="2px" />

        <div style="height: 10px"></div>
        <div class="play-pause">
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
  </div>
</template>

<script setup lang="ts">
import { PropType, ref, onMounted } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { SoundModel } from './models';
import SoundWaveform from './SoundWaveform.vue';

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
  stopSound,
} from 'src/composables/sound-controller';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: false },
});

const sound = soundsStore.editedSound;
const soundWaveforms = ref<typeof SoundWaveform | null>(null);
onMounted(() => {
  console.log('soundDetails onMounted');
});

function closeButtonClicked() {
  stopSound(sound!);
  soundsStore.showEditWindow = false;
}
function playButtonClicked() {
  if (sound?.audioElement.paused) {
    playSound(sound, true);
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
.sound-details {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.row {
  margin-bottom: 20px;
}
.soundName {
  max-width: 100%;
  text-align: center;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  widows: 80%;
}
.volume-container {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.volume-slider {
  flex: 5;
}

.normalize-button {
  background-color: var(--blueColor);
  flex: 0.5;
}
.filter-container {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.filter-slider {
  flex: 5;
}
.filter-button {
  background-color: green;
  flex: 0.5;
}
.in-out-buttons {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.set-mark-button {
  background-color: var(--blueColor);
}
.delete-mark-button {
  background-color: red;
}
.zoom-buttons {
  display: flex;
  justify-content: space-evenly;
  gap: 10px;
}
.zoom-button {
  background-color: var(--blueColor);
}
.soundDetailsBackground {
  border: 1px solid;
  border-radius: 10px;

  background-color: var(--bkgColor);
  width: 90%;
}
.play-pause {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
}
.close-button {
  display: flex;
  justify-content: center;
  align-items: center;
}
.separator {
  margin-top: 20px;
  margin-bottom: 20px;
}
</style>
