<template>
  <div>
    <PeakMeter
      :analyserObject="r?.stereoAnalyser"
      class="meter-style"
      ref="peakMeter"
    />
    <div class="recorder-panel">
      <div ref="waveformView" class="waveform-view"></div>
      <div ref="controlPanel" class="control-panel">
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
            {{ getNameDialogLabel() }}
            <q-dialog
              v-model="showNameDialog"
              auto-save
              :cover="false"
              :offset="[0, 20]"
            >
              <q-card class="name-dialog q-pa-md" style="padding: 10px">
                <q-input
                  v-if="r.state === RecorderState.PLAYING_RECORDED_SOUND"
                  :input-style="{ color: 'orange', fontSize: '1.5rem' }"
                  color="orange"
                  clearable
                  v-model="recordedSoundVModel"
                  dense
                  autofocus
                  @keyup.enter="handleRecordedSoundNameEnterKeyPressed"
                  @update:model-value="handleRecordedSoundNameModelUpdate"
                />

                <q-input
                  v-else
                  :input-style="{ color: 'orange', fontSize: '1.5rem' }"
                  color="orange"
                  clearable
                  v-model="currentSound.name"
                  dense
                  autofocus
                  @keyup.enter="
                    currentSound.name.trim() !== ''
                      ? (showNameDialog = false)
                      : null
                  "
                />
              </q-card>
            </q-dialog>
          </div>
        </div>
        <div class="markers-panel">
          <div class="markers-control">
            <div class="markers-control-label">Markers</div>
            <q-btn
              @click="addMarker()"
              color="secondary"
              icon="add"
              size="md"
              dense
            />
          </div>
          <div class="markers-display">
            <TransitionGroup name="markers-transition">
              <div
                v-for="(marker, index) in getMarkerArray()"
                :key="marker.id"
                class="markers-table"
              >
                <div class="markers-table-id">
                  {{ getMarkerArray().length - index }}
                </div>
                <div class="markers-table-button">
                  <q-btn
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
                    <q-card class="name-dialog q-pa-md" style="padding: 10px">
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
                    color="red"
                    icon="delete"
                    size="xs"
                    dense
                    @click="deleteMarker(marker)"
                  />
                </div>
              </div>
            </TransitionGroup>
          </div>
          <div></div>
        </div>
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
      <RecordedSoundsPanel class="recorded-sounds-panel" />
    </div>
  </div>
  <q-dialog v-model="showRecordedSoundsDialog">
    <div class="recorded-sounds-dialog"><RecordedSoundsPanel /></div>
  </q-dialog>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import { onMounted, ref, watch, TransitionGroup } from 'vue';
import { Recorder } from 'src/scripts/recorder';
import { RecorderWaveform } from 'src/scripts/recorder-waveform';
import { getMMSSfromS } from 'src/scripts/math-helpers';
import { RecordedSound, SoundMarker } from './models';
import { RecorderState } from 'src/components/models';
import PeakMeter from './PeakMeter.vue';
import RecordedSoundsPanel from './RecordedSoundsPanel.vue';
import { Dialog } from 'quasar';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
const soundLibraryStore = useSoundLibraryStore();

const r = ref(new Recorder());
const waveformView = ref<HTMLDivElement | null>(null);
let waveform: RecorderWaveform;
const peakMeter = ref<typeof PeakMeter | null>(null);

const currentSound = ref<RecordedSound>(getDefaultSound());

onMounted(() => {
  setInterval(() => {
    updateTimeLabel();
  }, 50);
});

function getDefaultSound() {
  return {
    id: uuidv4(),
    name: 'Recording',
    markers: [],
    totalLengthInMs: 0,
    peakData: [],
    isPlaying: false,
    showNameDialog: false,
  } as RecordedSound;
}

async function init() {
  await initRecorder();
  initWaveform();
}

async function initRecorder() {
  await r.value.init();
  peakMeter.value?.setAnalyserObject(r.value.stereoAnalyser);

  if (r.value.recorder) {
    r.value.recorder.onstart = () => {
      waveform.startCollectingPeakValues();
      r.value.startTime = Date.now();
      r.value.state = RecorderState.RECORDING;
    };
    r.value.recorder.onstop = () => {
      currentSound.value.totalLengthInMs = getCurrentRecordingLength();
      waveform.stopCollectingPeakValues();
      currentSound.value.peakData = waveform.getPeakValues();
      waveform.setWaveformColor('orange');
      r.value.state = RecorderState.STOPPED;
    };
  }
}

function initWaveform() {
  if (waveformView.value === null) return;
  if (r.value.stereoAnalyser === undefined) return;
  waveform = new RecorderWaveform(waveformView.value, r.value.stereoAnalyser);
}

async function recordButtonClicked() {
  if (r.value.state === RecorderState.NOT_INITIALIZED) {
    await init();
  }
  if (r.value.state === RecorderState.RECORDING) {
    stopRecording();
  } else {
    startRecording();
  }
}

function getRecordButtonColor() {
  switch (r.value.state) {
    case RecorderState.RECORDING:
      return 'red';
    case RecorderState.PLAYING_RECORDED_SOUND:
      return 'green';
    default:
      return 'orange';
  }
}

function stopButtonClicked() {
  if (r.value.state === RecorderState.RECORDING) {
    stopRecording();
  } else if (r.value.state === RecorderState.PLAYING_RECORDED_SOUND) {
    if (!soundLibraryStore.selectedSound?.isPlaying) {
      soundLibraryStore.playSelectedSound();
    } else {
      soundLibraryStore.pauseSelectedSound();
    }
  }
}

function getStopButtonColor() {
  switch (r.value.state) {
    case RecorderState.RECORDING:
      return 'red';
    case RecorderState.PLAYING_RECORDED_SOUND:
      return 'green';
    default:
      return 'orange';
  }
}
function getStopButtonIcon() {
  if (r.value.state === RecorderState.PLAYING_RECORDED_SOUND) {
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
    r.value.state === RecorderState.NOT_INITIALIZED ||
    r.value.state === RecorderState.READY
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
    switch (r.value.state) {
      case RecorderState.RECORDING:
        resetState();
        stopRecording(false);
      case RecorderState.STOPPED:
        soundLibraryStore.deleteRecordedSoundFromLibrary(currentSound.value);
        resetState();
      case RecorderState.PLAYING_RECORDED_SOUND:
        const sound = soundLibraryStore.selectedSound;
        if (sound !== null) {
          soundLibraryStore.stopSelectedSound();
          soundLibraryStore.deleteRecordedSoundFromLibrary(sound);
          resetState();
        }
      default:
        resetState();
        stopRecording(false);
    }
  });
}

function getDeleteDialogLabel() {
  switch (r.value.state) {
    case RecorderState.RECORDING:
      return 'Stop recording and delete sound ?';
    case RecorderState.STOPPED:
      return 'Delete sound ?';
    case RecorderState.PLAYING_RECORDED_SOUND:
      return 'Delete ' + soundLibraryStore.selectedSound?.name + ' ?';
  }
}

function startRecording() {
  soundLibraryStore.stopSelectedSound();
  resetState();
  r.value.setRecordedSound(currentSound.value);
  r.value.startRecording();
  waveform.setWaveformColor('red');
  waveform.addMarker('red');
  waveform.resetWaveform();
}

function stopRecording(save = true) {
  r.value.stopRecording(save);
  if (!save) resetState();
}

function setRecordingMode() {
  waveform.setWaveformToDraw('realtime');
  waveform.setWaveformColor('orange');
  if (r.value.state) r.value.state = RecorderState.READY;
  soundNameVModel.value = currentSound.value.name;
}

function resetState() {
  currentSound.value = getDefaultSound();
  waveform.resetWaveform();
  waveform.deleteAllMarkers();
  setRecordingMode();
}

const recordingLength = ref(0);
const recordingLengthLabel = ref('');

function getCurrentRecordingLength() {
  if (r.value.state !== RecorderState.RECORDING) {
    return 0;
  } else {
    return Date.now() - r.value.startTime;
  }
}
function updateTimeLabel() {
  if (r.value.state === RecorderState.STOPPED) {
    recordingLength.value = currentSound.value.totalLengthInMs ?? 0;
    recordingLengthLabel.value = getMMSSfromS(recordingLength.value / 1000);
  } else if (r.value.state === RecorderState.PLAYING_RECORDED_SOUND) {
    const position =
      soundLibraryStore.selectedSound?.audioElement?.currentTime ?? 0;
    recordingLengthLabel.value = getMMSSfromS(position);
  } else if (r.value.state !== RecorderState.RECORDING) {
    recordingLength.value = 0;
    recordingLengthLabel.value = '';
  } else {
    recordingLength.value = getCurrentRecordingLength();
    recordingLengthLabel.value = getMMSSfromS(
      getCurrentRecordingLength() / 1000
    );
  }
}

function getMarkerArray(): SoundMarker[] {
  if (r.value.state === RecorderState.RECORDING) {
    const proxy = [...currentSound.value.markers];
    return sortMarkersArrayByTimeAndReverse(proxy);
  } else if (r.value.state === RecorderState.PLAYING_RECORDED_SOUND) {
    const proxy = [...(soundLibraryStore.selectedSound?.markers ?? [])];
    return sortMarkersArrayByTimeAndReverse(proxy);
  } else {
    return [];
  }
}

function sortMarkersArrayByTimeAndReverse(array: SoundMarker[]) {
  return array.sort((a, b) => b.positionInMs - a.positionInMs);
}
function addMarker() {
  if (r.value.state === RecorderState.RECORDING) {
    waveform.addMarker('rgb(40, 134, 189)');
    const id = currentSound.value.markers?.length + 1 ?? 0;
    currentSound.value.markers?.push({
      id: id,
      positionInMs: getCurrentRecordingLength(),
      name: 'Marker ' + id,
      showDialog: false,
      nameHasBeenEdited: false,
    });
  } else if (r.value.state === RecorderState.PLAYING_RECORDED_SOUND) {
    const time =
      soundLibraryStore.selectedSound?.audioElement?.currentTime ?? 0;
    console.log(time);
    const id = (soundLibraryStore.selectedSound?.markers?.length ?? 0) + 1;
    soundLibraryStore.selectedSound?.markers?.push({
      id: id,
      positionInMs:
        (soundLibraryStore.selectedSound?.audioElement?.currentTime ?? 0) *
        1000,
      name: 'Marker ' + id,
      showDialog: false,
      nameHasBeenEdited: false,
    });
    waveform.setMarkers(soundLibraryStore.selectedSound?.markers ?? []);
  }
}

function deleteMarker(marker: SoundMarker) {
  if (r.value.state === RecorderState.RECORDING) {
    currentSound.value.markers = currentSound.value.markers.filter(
      (m) => m.id !== marker.id
    );
    waveform.setMarkers(currentSound.value.markers);
  } else if (r.value.state === RecorderState.PLAYING_RECORDED_SOUND) {
    soundLibraryStore.selectedSound?.markers?.splice(
      soundLibraryStore.selectedSound?.markers?.indexOf(marker) ?? 0,
      1
    );
    waveform.setMarkers(soundLibraryStore.selectedSound?.markers ?? []);
    soundLibraryStore.updateSoundMarkers(soundLibraryStore.selectedSound!);
  }
}

function markerClicked(marker: SoundMarker) {
  if (!marker.nameHasBeenEdited) {
    marker.name = '';
    marker.nameHasBeenEdited = true;
  }
  marker.showDialog = !marker.showDialog;
}

watch(
  () => soundLibraryStore.selectedSound?.markers,
  (markers) => {
    if (
      soundLibraryStore.selectedSound !== null &&
      markers !== undefined &&
      waveform !== undefined
    ) {
      waveform.setMarkers(soundLibraryStore.selectedSound.markers);
    }
  },
  { deep: true }
);
const soundNameVModel = ref('');

const showNameDialog = ref(false);
function nameClicked() {
  showNameDialog.value = !showNameDialog.value;
}

function getNameDialogLabel() {
  switch (r.value.state) {
    case RecorderState.NOT_INITIALIZED:
      return currentSound.value.name;
    case RecorderState.RECORDING:
      return currentSound.value.name;
    case RecorderState.STOPPED:
      return currentSound.value.name;
    case RecorderState.READY:
      return currentSound.value.name;
    case RecorderState.PLAYING_RECORDED_SOUND:
      return soundLibraryStore.selectedSound?.name ?? 'Recording';
    default:
      return 'Recording';
  }
}

const showRecordedSoundsDialog = ref(false);
function openRecordedSoundsDialog() {
  showRecordedSoundsDialog.value = true;
}

watch(
  () => soundLibraryStore.recordingSaved,
  async (newValue) => {
    if (newValue === true) {
      const lastRecordedSound = soundLibraryStore.recordedSounds[0];
      await soundLibraryStore.setSelectedSound(lastRecordedSound);
      soundLibraryStore.recordingSaved = false;
    }
  }
);

watch(
  () => soundLibraryStore.selectedSoundChanged,
  async (newValue) => {
    if (newValue === true && soundLibraryStore.selectedSound !== null) {
      initializePlayerMode(soundLibraryStore.selectedSound);
    }
    soundLibraryStore.selectedSoundChanged = false;
  }
);

async function initializePlayerMode(sound: RecordedSound) {
  const audioElement = sound.audioElement;
  if (r.value.state === RecorderState.NOT_INITIALIZED) {
    await init();
  }
  if (audioElement) {
    waveform.setAudioElement(audioElement);
    waveform.setSoundDuration(sound.totalLengthInMs / 1000);
    waveform.setPeakValues(sound.peakData);
    waveform.setWaveformToDraw('recorded');
    waveform.setWaveformColor('orange');
    waveform.deleteAllMarkers();
    waveform.setMarkers(sound.markers);
    r.value.state = RecorderState.PLAYING_RECORDED_SOUND;
    soundNameVModel.value = sound.name;
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

const handleRecordedSoundNameEnterKeyPressed = () => {
  if (recordedSoundVModel.value.trim() !== '') {
    showNameDialog.value = false;
  }
};

const handleRecordedSoundNameModelUpdate = (newValue: any) => {
  if (newValue.trim() === '') return;
  recordedSoundVModel.value = newValue;
  soundLibraryStore.updateSelectedSoundName(newValue);
};
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
}
.meter-style {
  height: 30px;
  width: 100%;
}
.waveform-view {
  width: 100%;
  height: 170px;
  border-radius: 10px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.144);
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
  margin-bottom: 10px;
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
  font-size: 3rem;
  justify-content: center;
}
.stop-delete-button {
  padding: 5px;
  font-size: 3rem;
  justify-content: center;
}
.sound-name-row {
  padding: 5px;
  margin-top: 5px;
  margin-bottom: 5px;
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
}
.name-dialog {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  background-color: var(--bkgColor);
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
}
.markers-control-label {
  font-size: 1.2rem;
  font-weight: bold;
  color: orange;
}
.markers-display {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 70%;
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
  height: 150px;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.137);
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
  border-radius: 5px;
}
.recorded-sounds-dialog {
  width: 100%;
  max-height: 60%;
  background-color: var(--bkgColor);
  padding: 5px;
}
</style>
