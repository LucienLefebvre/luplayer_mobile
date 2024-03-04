<template>
  <q-card class="sound-details-background">
    <div>
      <div class="sound-name-color-row">
        <div style="display: flex; align-items: flex-start; width: 7%">
          <q-btn
            v-if="showLeftArrow()"
            flat
            round
            class="left-right-arrow"
            icon="west"
            @click="leftArrowClicked()"
            size="xs"
          />
        </div>
        <div class="sound-name-color">
          <q-btn
            :style="{
              'background-color': getSoundColor(sound),
              'text-color': getCssVar('secondary') ?? 'orange',
            }"
            size="sm"
            @click="colorClicked()"
          />
          <q-dialog
            v-model="showColorDialog"
            auto-save
            :cover="false"
            :offset="[0, 20]"
          >
            <q-card class="name-color-dialog">
              <q-color
                v-model="sound.color"
                no-header
                no-footer
                default-view="palette"
              />
            </q-card>
          </q-dialog>
          <div
            class="sound-name"
            :style="{ color: sound.color }"
            @click="nameClicked()"
          >
            {{ sound.name }}
            <q-dialog
              v-model="showNameDialog"
              auto-save
              :cover="false"
              :offset="[0, 20]"
            >
              <q-card class="name-color-dialog" style="padding: 10px">
                <q-input
                  :input-style="{ color: 'orange' }"
                  color="orange"
                  clearable
                  v-model="sound.name"
                  dense
                  autofocus
                  @keyup.enter="
                    sound.name.trim() !== '' ? (showNameDialog = false) : null
                  "
                />
              </q-card>
            </q-dialog>
          </div>
        </div>
        <div style="display: flex; align-items: flex-end; width: 7%">
          <q-btn
            v-if="showRightArrow()"
            flat
            round
            class="left-right-arrow"
            icon="east"
            @click="rightArrowClicked()"
            size="xs"
          />
        </div>
      </div>
      <q-separator class="separator" size="2px" color="secondary" />
      <div class="row volume-container">
        <div class="trim-gain-value">{{ sound.trimDb }}dB</div>
        <div>-24</div>
        <q-slider
          label
          :label-value="sound.trimDb + 'dB'"
          v-model="sound.trimDb"
          @update:model-value="setTrimGain(sound, $event!)"
          :min="-24"
          :max="24"
          :step="0.1"
          track-size="4px"
          thumb-size="20px"
          color="orange"
          class="volume-slider"
          :markers="24"
        />
        <div>+24</div>
      </div>
      <q-separator class="separator" size="2px" color="secondary" />

      <div class="time-display-row">
        <div class="duration-group">
          <div class="duration-text">Elapsed :</div>
          <div class="duration-label">{{ getMMSSfromS(soundCurrentTime) }}</div>
        </div>
        <div class="duration-group">
          <div class="duration-text">Duration :</div>
          <div class="duration-label">
            {{ getMMSSfromS(sound.audioElement.duration) }}
          </div>
        </div>
        <div class="duration-group">
          <div class="duration-text">Remaining :</div>
          <div class="duration-label">
            {{ getMMSSfromS(soundRemainingTime) }}
          </div>
        </div>
      </div>
      <div style="height: 5px"></div>
      <div ref="minimapWaveformView" class="waveform-container"></div>

      <div ref="zoomableWaveformView" class="waveform-container"></div>
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
      <div style="height: 10px"></div>
      <div class="buttons-row" v-if="isCartSound(sound)">
        <div class="buttons-row-group">
          <q-btn
            label="loop"
            icon="loop"
            @click="loopButtonClicked(sound)"
            class="set-mark-button"
            size="sm"
            :style="{
              'background-color': sound.isLooping ? 'red' : 'orange',
            }"
          />
        </div>
        <div class="buttons-row-group">
          <q-btn
            label="retrigger"
            icon="start"
            @click="retriggerButtonClicked(sound)"
            class="set-mark-button"
            size="sm"
            :style="{
              'background-color': sound.retrigger ? 'red' : 'orange',
            }"
          />
        </div>
      </div>
      <q-separator class="separator" size="2px" color="secondary" />
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
          @click="soundsStore.askForSoundDeletion(sound)"
        />
      </div>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { useSoundsStore } from '../stores/sounds-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { SoundModel, EnveloppePoint } from './models';
import { Waveform } from 'src/composables/waveform';
import {
  isCartSound,
  setEnveloppeGainValues,
} from 'src/composables/sound-controller';
import { dbToGain, getMMSSfromS } from 'src/composables/math-helpers';
import {
  deleteInTime,
  deleteOutTime,
  pauseSound,
  playSound,
  setInTimeAtCurrentPosition,
  setOutTimeAtCurrentPosition,
  setTrimGain,
  stopSound,
  getSoundColor,
  setPlaylistActiveSound,
} from 'src/composables/sound-controller';
import { getCssVar } from 'quasar';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

const sound = soundsStore.selectedSound as SoundModel;

let minimap: Waveform | null = null;
const minimapWaveformView = ref<HTMLDivElement | null>(null);

let zoomable: Waveform | null = null;
const zoomableWaveformView = ref<HTMLDivElement | null>(null);

const soundCurrentTime = ref(0);
const soundRemainingTime = ref(sound.audioElement.duration);

onMounted(() => {
  console.log('sound-details onMounted');
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
  zoomable.showHorizontalLine = true;
  zoomable?.setVerticalZoomFactor(
    dbToGain(sound.trimDb) * settingsStore.waveformVerticalZoomFactor
  );
  zoomable.setPlayedWaveformFillColor(sound.color);
  zoomable.setRemainingWaveformFillColor(sound.color);
  zoomable.setEnveloppePoints(sound.enveloppePoints);
  zoomable.setShowEnveloppe(sound.enveloppeIsEnabled);
  zoomable.setShowEnveloppePoints(true);
  zoomable.setShowEnveloppeLine(true);
  zoomable.showLastClickedPoint = true;

  minimap.name = 'minimap';
  minimap.setMinimapRangeRectangleOpacity(0.2);
  minimap.showInTime = true;
  minimap.showOutTime = true;
  minimap.inTimeColor = 'lightblue';
  minimap.outTimeColor = 'yellow';
  minimap.showPlayHead = true;
  minimap.setPlayedWaveformFillColor(sound.color);
  minimap.setRemainingWaveformFillColor(sound.color);
  minimap?.setVerticalZoomFactor(
    dbToGain(sound.trimDb) * settingsStore.waveformVerticalZoomFactor
  );

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
      //playSound(sound, true, false);
    }
  });
  zoomable.addEventListener('waveformDrag', () => {
    if (zoomable && zoomable.wasPlayingOnDragStart) {
      //pauseSound(sound);
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

  sound.audioElement.addEventListener('timeupdate', () => {
    soundCurrentTime.value = sound.audioElement.currentTime;
    soundRemainingTime.value =
      sound.audioElement.duration - sound.audioElement.currentTime;
  });
});

onBeforeUnmount(() => {
  if (zoomable) {
    zoomable.cleanUp();
    zoomable.minimapWaveformReference = null;
    zoomable = null;
  }

  if (minimap) {
    minimap.cleanUp();
    minimap.zoomableWaveformReference = null;
    minimap = null;
  }

  if (sound.audioElement.paused) {
    sound.audioElement.currentTime = 0;
  }
});

const showNameDialog = ref(false);
function nameClicked() {
  showNameDialog.value = !showNameDialog.value;
}

const showColorDialog = ref(false);
function colorClicked() {
  showColorDialog.value = !showColorDialog.value;
}

function loopButtonClicked(sound: SoundModel) {
  sound.isLooping = !sound.isLooping;
  if (sound.isLooping) sound.retrigger = false;
}

function retriggerButtonClicked(sound: SoundModel) {
  sound.retrigger = !sound.retrigger;
  if (sound.retrigger) sound.isLooping = false;
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
  () => sound.enveloppePoints,
  () => {
    sound.enveloppeIsEnabled = true;
    zoomable?.setShowEnveloppe(true);
  },
  { deep: true }
);

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
  () => sound?.trimDb,
  (newValue) => {
    if (newValue) {
      zoomable?.setVerticalZoomFactor(
        dbToGain(newValue) * settingsStore.waveformVerticalZoomFactor
      );
      minimap?.setVerticalZoomFactor(
        dbToGain(newValue) * settingsStore.waveformVerticalZoomFactor
      );
    }
  }
);

watch(
  () => sound?.color,
  (newValue) => {
    if (newValue && zoomable && minimap) {
      zoomable.setPlayedWaveformFillColor(sound.color);
      zoomable.setRemainingWaveformFillColor(sound.color);
      minimap.setPlayedWaveformFillColor(sound.color);
      minimap.setRemainingWaveformFillColor(sound.color);
    }
  }
);

function getPreviousSound(): SoundModel | null {
  if (soundsStore.playerMode === 'playlist') {
    const currentIndex = soundsStore.playlistSounds.indexOf(sound);
    if (soundsStore.playlistSounds[currentIndex - 1]) {
      return soundsStore.playlistSounds[currentIndex - 1];
    }
    return null;
  } else if (soundsStore.playerMode === 'cart') {
    if (soundsStore.cartSounds0.includes(sound)) {
      const currentIndex = soundsStore.cartSounds0.indexOf(sound);
      if (soundsStore.cartSounds1[currentIndex - 1]) {
        return soundsStore.cartSounds1[currentIndex - 1];
      } else if (soundsStore.cartSounds0[currentIndex - 1]) {
        return soundsStore.cartSounds0[currentIndex - 1];
      }
      return null;
    } else if (soundsStore.cartSounds1.includes(sound)) {
      const currentIndex = soundsStore.cartSounds1.indexOf(sound);
      if (soundsStore.cartSounds0[currentIndex]) {
        return soundsStore.cartSounds0[currentIndex];
      } else if (soundsStore.cartSounds1[currentIndex - 1]) {
        return soundsStore.cartSounds1[currentIndex - 1];
      }
      return null;
    }
  }
  return null;
}

const emits = defineEmits(['remount']);

function showLeftArrow() {
  const isPlaylistAndPlaying =
    soundsStore.playerMode === 'playlist' && sound.isPlaying;
  return getPreviousSound() !== null && !isPlaylistAndPlaying;
}

function leftArrowClicked() {
  const sound = getPreviousSound();
  if (sound) {
    setEditedSound(sound);
  }
}

function getNextSound(): SoundModel | null {
  if (soundsStore.playerMode === 'playlist') {
    const currentIndex = soundsStore.playlistSounds.indexOf(sound);
    if (soundsStore.playlistSounds[currentIndex + 1]) {
      return soundsStore.playlistSounds[currentIndex + 1];
    }
    return null;
  } else if (soundsStore.playerMode === 'cart') {
    if (soundsStore.cartSounds0.includes(sound)) {
      const currentIndex = soundsStore.cartSounds0.indexOf(sound);
      if (soundsStore.cartSounds1[currentIndex]) {
        return soundsStore.cartSounds1[currentIndex];
      } else if (soundsStore.cartSounds0[currentIndex + 1]) {
        return soundsStore.cartSounds0[currentIndex + 1];
      }
      return null;
    } else if (soundsStore.cartSounds1.includes(sound)) {
      const currentIndex = soundsStore.cartSounds1.indexOf(sound);
      if (soundsStore.cartSounds0[currentIndex + 1]) {
        return soundsStore.cartSounds0[currentIndex + 1];
      } else if (soundsStore.cartSounds1[currentIndex + 1]) {
        return soundsStore.cartSounds1[currentIndex + 1];
      }
      return null;
    }
  }
  return null;
}

function showRightArrow() {
  const isPlaylistAndPlaying =
    soundsStore.playerMode === 'playlist' && sound.isPlaying;
  return getNextSound() !== null && !isPlaylistAndPlaying;
}

function rightArrowClicked() {
  const sound = getNextSound();
  if (sound) {
    setEditedSound(sound);
  }
}

function setEditedSound(sound: SoundModel) {
  if (soundsStore.playerMode === 'cart') {
    soundsStore.selectedSound = sound;
    emits('remount');
  } else if (
    soundsStore.playerMode === 'playlist' &&
    !soundsStore.selectedSound?.isPlaying
  ) {
    setPlaylistActiveSound(sound, true);
    emits('remount');
  }
}
</script>

<style scoped>
.sound-details-background {
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  border-bottom-left-radius: 0px;
  border-bottom-left-radius: 0px;
  background-color: rgb(50, 62, 68);
  width: 100%;
  padding: 5px;
}
.sound-name-color-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.sound-name-color {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 10px;
  max-width: 80%;
}
.left-right-arrow {
  color: var(--blueColor);
  background-color: yellow;
  justify-content: right;
  width: 10%;
}
.sound-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 1.2rem;
  font-family: 'Roboto', sans-serif;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.137);
  border-radius: 5px;
  padding-left: 5px;
  padding-right: 5px;
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
  vertical-align: middle;
  padding: 10px;
  gap: 10px;
  color: var(--blueColor);
  font-size: 1rem;
}
.trim-gain-value {
  width: 65px;
  color: var(--blueColor);
  background-color: orange;
  border-radius: 5px;
  text-align: center;
  vertical-align: middle;
  height: 22px;
  font-family: 'Roboto', sans-serif;
  font-weight: bold;
}
.volume-slider {
  flex: 5;
  transform: translate(0, -5px);
}
.buttons-row {
  display: flex;
  justify-content: space-evenly;
  gap: 10px;
}
.buttons-row-group {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  gap: 10px;
}
.set-mark-button {
  background-color: var(--blueColor);
}
.delete-mark-button {
  background-color: red;
}
.play-pause {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
  padding: 10px;
}
.separator {
  margin-top: 10px;
  margin-bottom: 10px;
}
.waveform-container {
  width: 100%;
  margin-top: 3px;
  margin-bottom: 3px;
  border-radius: 10px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.144);
}
.time-display-row {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
  color: yellow;
}
.duration-group {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 10px;
}
.duration-label {
  color: yellow;
  background-color: rgba(255, 255, 0, 0.116);
  border-radius: 6px;
  padding-left: 4px;
  padding-right: 4px;
  font-size: 1rem;
}
.duration-text {
  color: yellow;
  font-size: 0.8rem;
}
</style>
