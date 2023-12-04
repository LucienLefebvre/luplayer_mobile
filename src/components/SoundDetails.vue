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
        <!-- <div class="row filter-container">
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
        </div> -->
        <q-separator color="primary" class="separator" size="2px" />

        <div style="height: 10px"></div>
        <div ref="minimapWaveformView" style="width: 100%"></div>
        <div ref="zoomableWaveformView" style="width: 100%"></div>
        <div style="height: 10px"></div>
        <div class="buttons-row">
          <div class="buttons-row-group">
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
          <div class="buttons-row-group">
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
          <div class="buttons-row-group">
            <q-btn
              label="point"
              @click="addEnveloppePointAtPlayPosition()"
              class="set-mark-button"
              size="sm"
            />
          </div>
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
import {
  PropType,
  ref,
  onMounted,
  Ref,
  watch,
  onUnmounted,
  onBeforeUnmount,
} from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { SoundModel, EnveloppePoint } from './models';
import { Waveform } from 'src/composables/waveform';

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
import { spritesheetAsset } from 'pixi.js';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const props = defineProps({
  sound: { type: Object as PropType<SoundModel>, required: false },
});

const sound = soundsStore.editedSound;

let minimap: Waveform | null = null;
const minimapWaveformView = ref<HTMLDivElement | null>(null);

let zoomable: Waveform | null = null;
const zoomableWaveformView = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (!minimapWaveformView.value || !zoomableWaveformView.value) return;

  zoomable = new Waveform(zoomableWaveformView.value, sound!.audioElement, 175);

  minimap = new Waveform(
    minimapWaveformView.value,
    sound!.audioElement,
    30,
    true,
    zoomable
  );

  zoomable.name = 'zoomable';
  zoomable.setIsAlwaysCenteredOnPlayPosition(true);
  zoomable.showPlayHead = true;
  zoomable.showInTime = true;
  zoomable.showOutTime = true;
  zoomable.inTimeColor = 'lightblue';
  zoomable.outTimeColor = 'yellow';
  zoomable.inTimeWidth = 2;
  zoomable.outTimeWidth = 2;
  zoomable.playHeadWidth = 2;
  zoomable.freezed = false;
  zoomable.showHorizontalLine = true;
  zoomable.setPlayedWaveformFillColor('orange');
  zoomable.setRemainingWaveformFillColor('orange');
  zoomable.setEnveloppePoints(sound!.enveloppePoints);
  zoomable.setShowEnveloppe(true);

  minimap.setMinimapRangeRectangleOpacity(0.2);
  minimap.showInTime = true;
  minimap.showOutTime = true;
  minimap.inTimeColor = 'lightblue';
  minimap.outTimeColor = 'yellow';
  minimap.freezed = false;
  minimap.setPlayedWaveformFillColor('orange');
  minimap.setRemainingWaveformFillColor('orange');

  if (sound?.waveformChunks) {
    minimap.setWaveformChunks(sound.waveformChunks);
    zoomable.setWaveformChunks(sound.waveformChunks);
  }

  zoomable.addEventListener('enveloppePointsChanged', () => {
    sound!.enveloppePoints = zoomable!.getEnveloppePoints();
    console.log('enveloppePointsChanged');
    console.log(sound!.enveloppePoints);
  });
});

onBeforeUnmount(() => {
  console.log('sound details Unmounted');
  if (zoomable) {
    zoomable.freezed = true;
    zoomable.cleanUp();
    zoomable.minimapWaveformReference = null;
    zoomable = null;
  }

  if (minimap) {
    minimap.freezed = true;
    minimap.cleanUp();
    minimap.zoomableWaveformReference = null;
    minimap = null;
  }
});

function closeButtonClicked() {
  if (sound?.isCuePlayed) stopSound(sound!);
  soundsStore.showEditWindow = false;
}
function playButtonClicked() {
  if (sound?.audioElement.paused) {
    playSound(sound, soundsStore.audioContext!, true);
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

function addEnveloppePointAtPlayPosition() {
  if (sound?.audioElement.currentTime) {
    const gainDb = zoomable!.getEnveloppeValueAtTime(
      sound.audioElement.currentTime
    );
    const point = {
      time: sound.audioElement.currentTime,
      gainDb: gainDb,
    } as EnveloppePoint;
    sound.enveloppePoints.push(point);
    sound.enveloppePoints = sound.enveloppePoints.sort(
      (a, b) => a.time - b.time
    );
    zoomable?.setEnveloppePoints(sound.enveloppePoints);
  }
}
watch(
  () => sound?.inTime,
  (newValue) => {
    if (newValue) {
      zoomable?.setInTime(newValue);
      minimap?.setInTime(newValue);
    } else {
      zoomable?.setInTime(null);
      minimap?.setInTime(null);
    }
  }
);
watch(
  () => sound?.outTime,
  (newValue) => {
    if (newValue) {
      zoomable?.setOutTime(newValue);
      minimap?.setOutTime(newValue);
    } else {
      zoomable?.setOutTime(null);
      minimap?.setOutTime(null);
    }
  }
);
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

.buttons-row {
  display: flex;
  justify-content: space-evenly;
  gap: 10px;
}
.buttons-row-group {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 10px;
}
.set-mark-button {
  background-color: var(--blueColor);
}
.delete-mark-button {
  background-color: red;
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
