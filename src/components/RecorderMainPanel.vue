<template>
  <div>
    <PeakMeter
      :analyserObject="recorderStore.recorder.stereoAnalyser"
      class="meter-style"
      ref="peakMeter"
    />
    <div class="recorder-panel">
      <div
        class="waveform-view not-initialized-waveform"
        :style="{ height: waveformViewHeight }"
        v-if="recorderStore.recorder.state === RecorderState.NOT_INITIALIZED"
        @click="init()"
      >
        <div>Tap here to monitor input...</div>
      </div>
      <div
        v-show="recorderStore.recorder.state !== RecorderState.NOT_INITIALIZED"
        ref="waveformView"
        class="waveform-view"
        :style="{ height: waveformViewHeight }"
      ></div>
      <div ref="controlPanel" class="control-panel">
        <div class="audio-settings-row">
          <q-btn
            :color="getRecordButtonColor()"
            icon="mic"
            size="md"
            label="settings"
            dense
            class="audio-settings-button"
            @click="audioSettingsButtonClicked"
          />

          <q-slider
            v-model="recorderStore.trimGain"
            :color="getRecordButtonColor()"
            dense
            class="trim-slider"
            track-size="5px"
            thumb-size="25px"
            :track-color="getRecordButtonColor()"
            :selection-color="getRecordButtonColor()"
            :min="-24"
            :max="24"
            :step="0.1"
            :markers="24"
            label
            :label-value="getTrimGainLabel()"
          />
        </div>
        <q-separator color="orange" size="2px" />
        <div class="recording-button-row">
          <div class="stop-delete-button">
            <q-btn
              size="25px"
              round
              :color="getStopButtonColor()"
              :icon="getStopButtonIcon()"
              @click="stopButtonClicked()"
            />
          </div>
          <div class="recording-button">
            <q-btn
              size="45px"
              round
              @click="recordButtonClicked()"
              :color="getRecordButtonColor()"
              :label="recordingLengthLabel"
            >
            </q-btn>
          </div>
          <div class="stop-delete-button">
            <q-btn
              size="25px"
              round
              :color="getStopButtonColor()"
              icon="delete"
              @click="deleteButtonClicked()"
            />
          </div>
        </div>
        <div class="sound-name-row">
          <div class="sound-name" @click="nameClicked()">
            {{ getNameLabel() }}
            <q-dialog persistent v-model="showNameDialog">
              <div class="name-dialog">
                <q-card class="name-dialog-panel q-pa-md" style="padding: 10px">
                  <q-input
                    v-if="
                      recorderStore.recorder.state ===
                      RecorderState.PLAYING_RECORDED_SOUND
                    "
                    :input-style="{
                      color: 'orange',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                    }"
                    color="orange"
                    clearable
                    v-model="recordedSoundVModel"
                    dense
                    autofocus
                    @keyup.enter="handleRecordedSoundNameEnterKeyPressed"
                  >
                  </q-input>
                  <q-input
                    v-else
                    :input-style="{
                      color: 'orange',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                    }"
                    color="orange"
                    clearable
                    v-model="recorderStore.currentSound.name"
                    dense
                    autofocus
                    @keyup.enter="
                      recorderStore.currentSound.name.trim() !== ''
                        ? (showNameDialog = false)
                        : null
                    "
                  >
                  </q-input>
                </q-card>
                <q-btn
                  color="secondary"
                  icon="done"
                  size="lg"
                  dense
                  @click="nameDialogButtonPressed"
                />
              </div>
            </q-dialog>
          </div>
        </div>
        <div class="markers-panel" v-if="settingsStore.recorder.showMarkers">
          <div class="markers-display">
            <TransitionGroup
              :name="markersTransitionEnabled ? 'markers-transition' : ''"
            >
              <div
                v-for="(marker, index) in recorderStore.getMarkerArray()"
                :key="marker.id"
                class="markers-table"
              >
                <div class="markers-table-id">
                  {{ recorderStore.getMarkerArray().length - index }}
                </div>
                <div class="markers-table-button">
                  <q-btn
                    v-if="
                      recorderStore.recorder.state === RecorderState.RECORDING
                    "
                    color="orange"
                    icon="edit"
                    size="xs"
                    dense
                    @click="markerClicked(marker)"
                  />
                  <q-dialog
                    v-model="marker.showDialog"
                    auto-save
                    :cover="false"
                    :offset="[0, 20]"
                  >
                    <q-card
                      class="name-dialog-panel q-pa-md"
                      style="padding: 10px"
                    >
                      <q-input
                        :input-style="{ color: 'orange', fontSize: '1.5rem' }"
                        color="orange"
                        clearable
                        v-model="marker.name"
                        dense
                        autofocus
                        @keyup.enter="
                          marker.name.trim() !== ''
                            ? (marker.showDialog = false)
                            : null
                        "
                      />
                    </q-card>
                  </q-dialog>
                </div>
                <div class="markers-table-name">
                  {{ marker.name }}
                </div>

                <div class="markers-table-time">
                  {{ getMMSSfromS(marker.positionInMs / 1000) }}
                </div>
                <div class="markers-table-button">
                  <q-btn
                    v-if="
                      recorderStore.recorder.state === RecorderState.RECORDING
                    "
                    color="red"
                    icon="delete"
                    size="xs"
                    dense
                    @click="recorderStore.deleteMarker(marker)"
                  />
                  <q-btn
                    v-if="
                      recorderStore.recorder.state ===
                      RecorderState.PLAYING_RECORDED_SOUND
                    "
                    color="green"
                    icon="play_arrow"
                    size="xs"
                    dense
                    @click="markerPlayButtonClicked(marker)"
                  />
                </div>
              </div>
            </TransitionGroup>
          </div>
          <TransitionGroup name="markers-transition">
            <div class="markers-control" key="m">
              <div class="markers-control-label">Markers</div>
              <q-btn
                v-if="recorderStore.recorder.state === RecorderState.RECORDING"
                @click="recorderStore.addMarker()"
                color="secondary"
                icon="add"
                size="md"
                dense
              />
            </div>
          </TransitionGroup>
          <div></div>
        </div>
        <div class="recorded-sounds-panel-label">
          Recorded sounds :
          <q-btn
            color="orange"
            icon="open_in_new"
            size="xs"
            dense
            @click="openRecordedSoundsDialog()"
          />
        </div>
        <RecordedSoundsPanel class="recorded-sounds-panel" mode="tiny" />
      </div>
    </div>
  </div>
  <q-dialog v-model="showRecordedSoundsDialog" position="bottom">
    <div class="recorded-sounds-dialog">
      <div class="recorded-sounds-dialog-panel-label">
        <q-btn
          color="red"
          icon="close"
          size="md"
          dense
          @click="showRecordedSoundsDialog = false"
        />
        Recorded sounds :
      </div>
      <RecordedSoundsPanel
        mode="large"
        style
        class="recorded-sounds-dialog-panel"
      />
    </div>
  </q-dialog>
  <q-dialog v-model="showAudioSettingsDialog" position="bottom">
    <div class="audio-settings-dialog"><RecorderAudioSettingsPanel /></div>
  </q-dialog>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, TransitionGroup, computed } from 'vue';

import { Dialog } from 'quasar';

import PeakMeter from './PeakMeter.vue';
import RecordedSoundsPanel from './RecordedSoundsPanel.vue';
import RecorderAudioSettingsPanel from './RecorderAudioSettingsPanel.vue';

import { getMMSSfromS } from 'src/scripts/math-helpers';
import { SoundMarker } from './models';
import { RecorderState } from 'src/components/models';

import { useRecorderStore } from 'src/stores/recorder-store';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
import { useSettingsStore } from 'src/stores/settings-store';
const recorderStore = useRecorderStore();
const soundLibraryStore = useSoundLibraryStore();
const settingsStore = useSettingsStore();

const waveformView = ref<HTMLDivElement | null>(null);
const peakMeter = ref<typeof PeakMeter | null>(null);

onMounted(() => {
  recorderStore.waveformView = waveformView.value;
  setInterval(() => {
    updateTimeLabel();
  }, 100);
});

async function init() {
  await recorderStore.init();
  peakMeter.value?.setAnalyserObject(recorderStore.recorder.stereoAnalyser);
}

const controlPanel = ref<HTMLDivElement | null>(null);
const controlPanelHeight = ref(0);
const controlPanelResizeObserver = new ResizeObserver(() => {
  updateControlPanelHeight();
});

function updateControlPanelHeight() {
  if (controlPanel.value) {
    controlPanelHeight.value = controlPanel.value.clientHeight;
  }
}

onMounted(() => {
  controlPanelResizeObserver.observe(controlPanel.value!);
});

const waveformViewHeight = computed(() => {
  if (!controlPanel.value) return '0px';
  const height = window.innerHeight - controlPanelHeight.value - 110;
  return height + 'px';
});

async function recordButtonClicked() {
  if (recorderStore.recorder.state === RecorderState.NOT_INITIALIZED) {
    await init();
  }
  if (recorderStore.recorder.state === RecorderState.RECORDING) {
    recorderStore.stopRecording();
  } else {
    recorderStore.startRecording();
  }
}

function getRecordButtonColor() {
  switch (recorderStore.recorder.state) {
    case RecorderState.RECORDING:
      return 'red';
    case RecorderState.PLAYING_RECORDED_SOUND:
      return 'green';
    default:
      return 'orange';
  }
}

function stopButtonClicked() {
  if (recorderStore.recorder.state === RecorderState.RECORDING) {
    recorderStore.stopRecording();
  } else if (
    recorderStore.recorder.state === RecorderState.PLAYING_RECORDED_SOUND
  ) {
    if (!soundLibraryStore.selectedSound?.isPlaying) {
      soundLibraryStore.playSelectedSound();
    } else {
      soundLibraryStore.pauseSelectedSound();
    }
  }
}

function getStopButtonColor() {
  switch (recorderStore.recorder.state) {
    case RecorderState.RECORDING:
      return 'red';
    case RecorderState.PLAYING_RECORDED_SOUND:
      return 'green';
    default:
      return 'orange';
  }
}
function getStopButtonIcon() {
  if (recorderStore.recorder.state === RecorderState.PLAYING_RECORDED_SOUND) {
    if (soundLibraryStore.selectedSound?.isPlaying) {
      return 'pause';
    } else {
      return 'play_arrow';
    }
  } else {
    return 'square';
  }
}

function deleteButtonClicked() {
  if (
    recorderStore.recorder.state === RecorderState.NOT_INITIALIZED ||
    recorderStore.recorder.state === RecorderState.READY
  )
    return;

  Dialog.create({
    title: getDeleteDialogLabel(),
    style: 'background-color: var(--bkgColor); color: orange',
    ok: {
      label: 'Yes',
      color: 'red',
    },
    cancel: {
      label: 'No',
      color: 'primary',
    },
  }).onOk(() => {
    switch (recorderStore.recorder.state) {
      case RecorderState.RECORDING:
        recorderStore.resetState();
        recorderStore.stopRecording(false);
      case RecorderState.STOPPED:
        soundLibraryStore.deleteRecordedSoundFromLibrary(
          recorderStore.currentSound
        );
        recorderStore.resetState();
      case RecorderState.PLAYING_RECORDED_SOUND:
        const sound = soundLibraryStore.selectedSound;
        if (sound !== null) {
          soundLibraryStore.stopSelectedSound();
          soundLibraryStore.deleteRecordedSoundFromLibrary(sound);
          recorderStore.resetState();
        }
      default:
        recorderStore.resetState();
        recorderStore.stopRecording(false);
    }
  });
}

function getDeleteDialogLabel() {
  switch (recorderStore.recorder.state) {
    case RecorderState.RECORDING:
      return 'Stop recording and delete sound ?';
    case RecorderState.STOPPED:
      return 'Delete sound ?';
    case RecorderState.PLAYING_RECORDED_SOUND:
      return 'Delete ' + soundLibraryStore.selectedSound?.name + ' ?';
  }
}

const recordingLength = ref(0);
const recordingLengthLabel = ref('');

function updateTimeLabel() {
  if (recorderStore.recorder.state === RecorderState.STOPPED) {
    recordingLength.value = recorderStore.currentSound.totalLengthInMs ?? 0;
    recordingLengthLabel.value = getMMSSfromS(recordingLength.value / 1000);
  } else if (
    recorderStore.recorder.state === RecorderState.PLAYING_RECORDED_SOUND
  ) {
    const position =
      soundLibraryStore.selectedSound?.audioElement?.currentTime ?? 0;
    recordingLengthLabel.value = getMMSSfromS(position);
  } else if (recorderStore.recorder.state !== RecorderState.RECORDING) {
    recordingLength.value = 0;
    recordingLengthLabel.value = '';
  } else {
    recordingLength.value = recorderStore.getCurrentRecordingLengthInMS();
    recordingLengthLabel.value = getMMSSfromS(
      recorderStore.getCurrentRecordingLengthInMS() / 1000
    );
  }
}

const markersTransitionEnabled = computed(() => {
  return recorderStore.recorder.state === RecorderState.RECORDING;
});

function markerClicked(marker: SoundMarker) {
  if (!marker.nameHasBeenEdited) {
    marker.name = '';
    marker.nameHasBeenEdited = true;
  }
  marker.showDialog = !marker.showDialog;
}

function markerPlayButtonClicked(marker: SoundMarker) {
  const audioElement = soundLibraryStore.selectedSound?.audioElement;
  if (audioElement) {
    audioElement.currentTime = marker.positionInMs / 1000;
    if (audioElement.paused) {
      soundLibraryStore.playSelectedSound();
    }
  }
}

watch(
  () => soundLibraryStore.selectedSound?.markers,
  (markers) => {
    if (
      soundLibraryStore.selectedSound !== null &&
      markers !== undefined &&
      recorderStore.waveform !== undefined
    ) {
      recorderStore.waveform?.setMarkers(
        soundLibraryStore.selectedSound.markers
      );
    }
  },
  { deep: true }
);

const showNameDialog = ref(false);
function nameClicked() {
  showNameDialog.value = !showNameDialog.value;
}

function getNameLabel() {
  switch (recorderStore.recorder.state) {
    case RecorderState.NOT_INITIALIZED:
      return recorderStore.currentSound.name;
    case RecorderState.RECORDING:
      return recorderStore.currentSound.name;
    case RecorderState.STOPPED:
      return recorderStore.currentSound.name;
    case RecorderState.READY:
      return recorderStore.currentSound.name;
    case RecorderState.PLAYING_RECORDED_SOUND:
      return soundLibraryStore.selectedSound?.name ?? 'Recording';
    default:
      return 'Recording';
  }
}

const recordedSoundVModel = ref('');
watch(
  () => soundLibraryStore.selectedSound?.name,
  (newValue) => {
    if (newValue) {
      recordedSoundVModel.value = newValue;
    }
  }
);

function nameDialogButtonPressed() {
  if (recorderStore.recorder.state === RecorderState.PLAYING_RECORDED_SOUND) {
    handleRecordedSoundNameEnterKeyPressed();
  } else {
    if (recorderStore.currentSound.name.trim() !== '') {
      showNameDialog.value = false;
    }
  }
}

const handleRecordedSoundNameEnterKeyPressed = () => {
  if (recordedSoundVModel.value.trim() !== '') {
    showNameDialog.value = false;
    handleRecordedSoundNameModelUpdate(recordedSoundVModel.value);
  }
};

const handleRecordedSoundNameModelUpdate = (newValue: any) => {
  if (newValue.trim() === '') return;
  recordedSoundVModel.value = newValue;
  soundLibraryStore.updateSelectedSoundName(newValue);
  console.log('update');
};

const showRecordedSoundsDialog = ref(false);
function openRecordedSoundsDialog() {
  showRecordedSoundsDialog.value = true;
}

watch(
  () => soundLibraryStore.selectedSoundChanged,
  async (newValue) => {
    if (newValue === true && soundLibraryStore.selectedSound !== null) {
      await recorderStore.initializePlayerMode(soundLibraryStore.selectedSound);
    } else if (newValue === true && soundLibraryStore.selectedSound === null) {
      recorderStore.resetState();
    }
    soundLibraryStore.selectedSoundChanged = false;
  }
);

watch(
  () => recorderStore.trimGain,
  (newValue) => {
    console.log('trim gain changed');
    recorderStore.recorder.setTrimGain(newValue);
  }
);

function getTrimGainLabel() {
  return recorderStore.trimGain.toFixed(1) + ' dB';
}

const showAudioSettingsDialog = ref(false);
function audioSettingsButtonClicked() {
  showAudioSettingsDialog.value = true;
}

watch(
  () => recorderStore.recorder.state,
  (state) => {
    if (state === RecorderState.PLAYING_RECORDED_SOUND) {
      recorderStore.waveform?.setShouldUpdateWaveform(false);
    } else {
      recorderStore.waveform?.setShouldUpdateWaveform(true);
    }
  }
);
</script>

<style scoped>
.recorder-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  flex-wrap: nowrap;
  padding: 7px;
  gap: 5px;
}
.meter-style {
  height: 30px;
  width: 100%;
  border-bottom: 2px solid orange;
}
.audio-settings-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 30px;
  padding: 5px;
  gap: 10px;
}
.audio-settings-button {
  flex: 0 0 auto;
}
.trim-slider {
  flex: 1;
}
.not-initialized-waveform {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.2rem;
  font-weight: bold;
  color: orange;
}
.waveform-view {
  width: 100%;
  height: 170px;
  border-radius: 10px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.144);
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
  margin-bottom: 10px;
  justify-content: center;
}
.control-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.recording-button-row {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  height: 100%;
  width: 100%;
  padding: 5px;
}
.record-button {
  padding: 5px;
  font-size: 2.8rem;
  justify-content: center;
}
.stop-delete-button {
  padding: 5px;
  font-size: 3rem;
  justify-content: center;
}
.sound-name-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 5px;
  margin-top: 5px;
  margin-bottom: 5px;
  height: 50px;
  max-width: 95%;
}
.sound-name {
  color: var(--blueColor);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 1.7rem;
  font-family: 'Roboto', sans-serif;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.137);
  border-radius: 5px;
  padding-left: 5px;
  padding-right: 5px;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
  margin: auto;
}
.name-dialog-panel {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  background-color: var(--bkgColor);
}
.name-dialog {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  gap: 10px;
}
.markers-panel {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
  width: 100%;
  padding: 3px;
  height: 90px;
}
.markers-control {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 20%;
}
.markers-control-label {
  font-size: 1rem;
  font-weight: bold;
  color: orange;
}
.markers-display {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 65%;
  background-color: rgba(0, 0, 0, 0.137);
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  padding: 5px;
}
.markers-table {
  font-size: 1.1rem;
  font-weight: bold;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
.markers-table-id {
  width: 5%;
  text-align: left;
  color: var(--blueColor);
}
.markers-table-name {
  display: flex;
  justify-content: left;
  align-items: center;
  color: orange;
  width: 75%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: left;
}
.markers-table-button {
  margin-left: 5px;
  margin-right: 5px;
}
.markers-table-time {
  width: 15%;
  text-align: right;
  color: var(--blueColor);
}
.markers-transition-move {
  transition: 0.3s ease;
}
.markers-transition-enter-active {
  transition: all 0.3s ease;
}
.markers-transition-leave-active {
  position: absolute;
  transition: all 0.3s ease;
}
.markers-transition-leave-to {
  opacity: 0;
  transform: scale(0.1);
}
.markers-transition-enter-from {
  opacity: 0;
  transform: scale(0.1);
}

.recorded-sounds-panel-label {
  font-size: 1.1rem;
  font-weight: bold;
  color: orange;
  margin-top: 10px;
  width: 100%;
  text-align: left;
}
.recorded-sounds-panel {
  width: 100%;
  height: 110px;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.137);
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
  border-radius: 5px;
}
.recorded-sounds-dialog {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.recorded-sounds-dialog-panel-label {
  display: flex;
  flex-direction: row;
  font-size: 1.4rem;
  font-weight: bold;
  color: orange;
  padding: 10px;
  text-align: center;
  justify-content: center;
  gap: 10px;
  background-color: rgba(0, 0, 0, 0.137);
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
  border-radius: 20px;
}
.recorded-sounds-dialog-panel {
  width: 100%;
  max-height: 500px;
  overflow-y: auto;
  padding: 5px;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
  background-color: var(--bkgColor);
  border-top-right-radius: 20px;
  border-top-left-radius: 20px;
}
.audio-settings-dialog {
  width: 100%;
  max-height: 60%;
  background-color: var(--bkgColor);
  padding: 5px;
}
</style>
