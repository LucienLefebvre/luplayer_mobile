<template>
  <div class="column sound-details">
    <div class="close-button">
      <q-btn
        @click="closeButtonClicked(sound)"
        icon="close"
        color="white"
        flat
        round
        dense
        size="20px"
      />
    </div>
    <q-card class="soundDetailsBackground">
      <div class="column justify-center">
        <!-- <div class="soundName">
          {{ sound.name }}
        </div> -->
        <q-btn
          :label="sound.name"
          :style="{
            'background-color': getSoundColor(sound),
            'text-color': getCssVar('secondary') ?? 'orange',
          }"
          @click="nameButtonClicked()"
        />

        <q-dialog v-model="showNameColorDialog">
          <div class="name-color-dialog">
            <q-input v-model="sound.name" style="color: orange" />
            <q-color
              v-model="sound.color"
              no-header
              no-footer
              default-view="palette"
            />
          </div>
        </q-dialog>
        <q-separator class="separator" size="1px" color="primary" />
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
        <q-separator class="separator" size="1px" color="primary" />

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
        </div>
        <div style="height: 10px"></div>
        <div ref="minimapWaveformView" class="waveform-container"></div>
        <div ref="zoomableWaveformView" class="waveform-container"></div>
        <div style="height: 10px"></div>
        <div class="buttons-row">
          <div class="buttons-row-group">
            <q-btn
              label="point"
              @click="addEnveloppePointAtPlayPosition(sound)"
              class="set-mark-button"
              size="sm"
            />
            <q-btn
              icon="delete"
              @click="deleteLastClickedPoint(sound)"
              class="delete-mark-button"
              size="sm"
            />
          </div>
        </div>

        <q-separator class="separator" size="1px" color="primary" />
        <div class="play-pause">
          <q-btn
            :label="getPlayButtonLabel(sound)"
            color="green"
            @click="playButtonClicked(sound)"
          />
          <q-btn
            :label="getPlayInOutButtonLabel(sound)"
            color="green"
            @click="playInOutButtonClicked(sound)"
          />

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
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { SoundModel, EnveloppePoint } from './models';
import { Waveform } from 'src/composables/waveform';
import { setEnveloppeGainValues } from 'src/composables/sound-controller';
import { dbToGain } from 'src/composables/math-helpers';
import {
  deleteInTime,
  deleteOutTime,
  pauseSound,
  playSound,
  setInTimeAtCurrentPosition,
  setOutTimeAtCurrentPosition,
  setTrimGain,
  normalizeSound,
  stopSound,
  getSoundColor,
} from 'src/composables/sound-controller';
import { getCssVar } from 'quasar';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const sound = soundsStore.editedSound as SoundModel;

let minimap: Waveform | null = null;
const minimapWaveformView = ref<HTMLDivElement | null>(null);

let zoomable: Waveform | null = null;
const zoomableWaveformView = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (!minimapWaveformView.value || !zoomableWaveformView.value) return;
  if (!sound) return;

  zoomable = new Waveform(zoomableWaveformView.value, sound.audioElement, 200);

  minimap = new Waveform(
    minimapWaveformView.value,
    sound.audioElement,
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
  zoomable.setEnveloppePoints(sound.enveloppePoints);
  zoomable.setShowEnveloppe(true);
  zoomable.setShowEnveloppePoints(true);
  zoomable.setShowEnveloppeLine(true);
  zoomable.showLastClickedPoint = true;

  minimap.setMinimapRangeRectangleOpacity(0.2);
  minimap.showInTime = true;
  minimap.showOutTime = true;
  minimap.inTimeColor = 'lightblue';
  minimap.outTimeColor = 'yellow';
  minimap.freezed = false;
  minimap.showPlayHead = true;
  minimap.setPlayedWaveformFillColor('orange');
  minimap.setRemainingWaveformFillColor('orange');

  if (sound.inTime) {
    zoomable.setInTime(sound.inTime);
    minimap.setInTime(sound.inTime);
  }
  if (sound.outTime) {
    zoomable.setOutTime(sound.outTime);
    minimap.setOutTime(sound.outTime);
  }

  if (sound.waveformChunks) {
    minimap.setWaveformChunks(sound.waveformChunks);
    zoomable.setWaveformChunks(sound.waveformChunks);
    zoomable.centerTimeRangeOnPlayPosition();
  }

  zoomable.addEventListener('waveformDragEnd', () => {
    if (zoomable && zoomable.wasPlayingOnDragStart) {
      playSound(sound, true, false);
    }
  });
  zoomable.addEventListener('waveformDrag', () => {
    if (zoomable && zoomable.wasPlayingOnDragStart) {
      pauseSound(sound);
    }
  });

  zoomable.addEventListener('enveloppePointsChanged', () => {
    if (!zoomable) return;
    sound.enveloppePoints = zoomable.getEnveloppePoints();
    setEnveloppeGainValues(sound);
  });

  minimap.addEventListener('click', () => {
    pauseSound(sound);
    playSound(sound, true, false);
  });
});

onBeforeUnmount(() => {
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

function closeButtonClicked(sound: SoundModel) {
  if (sound.isCuePlayed) stopSound(sound);
  if (sound.hasBeenCuePlayed) {
    sound.hasBeenCuePlayed = false;
    sound.audioElement.currentTime = sound.inTime ?? 0;
  }
  soundsStore.showEditWindow = false;
}

const showNameColorDialog = ref(false);
function nameButtonClicked() {
  showNameColorDialog.value = true;
}

function playButtonClicked(sound: SoundModel) {
  if (!sound.isPlaying) {
    playSound(sound, true, false);
    sound.hasBeenCuePlayed = true;
  } else {
    pauseSound(sound);
  }
}
function playInOutButtonClicked(sound: SoundModel) {
  if (!sound.isPlaying) {
    playSound(sound, false, false);
  } else {
    stopSound(sound);
  }
}
function getPlayButtonLabel(sound: SoundModel) {
  if (!sound.isPlaying) {
    return 'play';
  } else {
    return 'pause';
  }
}

function getPlayInOutButtonLabel(sound: SoundModel) {
  if (!sound.isPlaying) {
    return 'play in-out';
  } else {
    return 'stop';
  }
}

function addEnveloppePointAtPlayPosition(sound: SoundModel) {
  if (zoomable && sound.audioElement.currentTime) {
    const gainDb = zoomable.getEnveloppeValueAtTime(
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
    zoomable.setEnveloppePoints(sound.enveloppePoints);
  }
  setEnveloppeGainValues(sound);
}

function deleteLastClickedPoint(sound: SoundModel) {
  if (zoomable) {
    const index = zoomable.lastClickedPointIndex;
    if (index < 1) return;
    if (index === sound.enveloppePoints.length - 1) return;
    sound.enveloppePoints.splice(index, 1);
    zoomable.lastClickedPointIndex = -1;
    zoomable.setEnveloppePoints(sound.enveloppePoints);

    setEnveloppeGainValues(sound);
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

watch(
  () => sound?.trimGain,
  (newValue) => {
    if (newValue) {
      zoomable?.setVerticalZoomFactor(dbToGain(newValue));
      minimap?.setVerticalZoomFactor(dbToGain(newValue));
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
.name-color-dialog {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  background-color: var(--bkgColor);
}
.volume-container {
  display: flex;
  justify-content: space-between;
  padding: 10px;
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
  /* border: 2px solid;
  border-color: var(--blueColor); */
  border-radius: 10px;
  background-color: var(--bkgColor);
  width: 100%;
  padding: 10px;
}
.play-pause {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
  padding: 10px;
}
.close-button {
  display: flex;
  justify-content: center;
  align-items: center;
}
.separator {
  margin-top: 10px;
  margin-bottom: 10px;
}
.waveform-container {
  width: 100%;
  margin-top: 3px;
  margin-bottom: 3px;
  border: 1px solid;
  border-color: orange;
  border-radius: 10px;
  box-shadow: 5px 5px 2px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
</style>
