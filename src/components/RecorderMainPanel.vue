<template>
  <div>
    <PeakMeter
      :analyserObject="r?.stereoAnalyser"
      class="meter-style"
      ref="peakMeter"
    />
    <div class="recorder-panel">
      <q-btn
        @click="enableButtonClicked()"
        color="primary"
        :label="getEnabledButtonLabel()"
      />
      <div ref="waveformView" class="waveform-view"></div>
      <div class="recording-button-row">
        <div class="recording-button">
          <q-btn size="xl" round @click="recordButtonClicked()" color="red">
            <q-icon :name="getRecordButtonIcon" size="xl" />
          </q-btn>
        </div>
        <div class="recording-time-label">{{ recordingLength }}</div>
      </div>
      <div>
        <q-input label="Recording name" v-model="soundName" />
      </div>
      <div>
        <div class="markers-panel">
          <q-btn
            @click="addMarker()"
            color="primary"
            icon="add"
            size="sm"
            class="markers-button"
          />
          <div>
            <div
              v-for="marker in currentSound?.markers"
              :key="marker.id"
              class="markers-table"
            >
              {{ marker.name }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import { computed, onMounted, ref, watch } from 'vue';
import { Recorder } from 'src/scripts/recorder';
import { RecorderWaveform } from 'src/scripts/recorder-waveform';
import { getMMSSMSfromMS, getMMSSfromS } from 'src/scripts/math-helpers';
import PeakMeter from './PeakMeter.vue';
import { RecordedSound, SoundMarker } from './models';

let r = ref(null as Recorder | null);
let waveformView = ref<HTMLDivElement | null>(null);
let waveform: RecorderWaveform;
let intervalId: ReturnType<typeof setTimeout> | null = null;
const peakMeter = ref<typeof PeakMeter | null>(null);

let currentSound: RecordedSound | null = null;
let soundName = ref('');
onMounted(() => {
  intervalId = setInterval(() => {
    getRecordingLengthLabel();
  }, 50);
});

function getEnabledButtonLabel() {
  if (r.value === null) {
    return 'Monitor input';
  }
  return 'Input monitored';
}

function enableButtonClicked() {
  if (r.value === null) {
    initRecorder();
  }
}
function initRecorder() {
  r.value = new Recorder();
  peakMeter.value?.setAnalyserObject(r.value.stereoAnalyser);

  if (waveformView.value === null) return;
  if (r.value.stereoAnalyser === undefined) return;
  waveform = new RecorderWaveform(waveformView.value, r.value.stereoAnalyser);
}

function recordButtonClicked() {
  if (r.value === null) {
    initRecorder();
  }
  if (r.value?.recorder?.state === 'recording') {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  r.value?.startRecording();
  waveform.setWaveformColor('red');
  waveform.addMarker('red');

  const newRecordedSound: RecordedSound = {
    id: uuidv4(),
    name: soundName.value,
    markers: [] as SoundMarker[],
  };

  currentSound = newRecordedSound;
}

function stopRecording() {
  r.value?.stopRecording();
  waveform.setWaveformColor('orange');
  waveform.addMarker('red');
}

const getRecordButtonIcon = computed(() => {
  if (r.value?.recording) {
    return 'stop';
  }
  return '';
});

const recordingLength = ref('0');

function getCurrentRecordingLength() {
  if (!r.value?.recording) {
    return 0;
  } else {
    return Date.now() - r.value.startTime;
  }
}
function getRecordingLengthLabel() {
  if (!r.value?.recording) {
    return getMMSSMSfromMS(0);
  } else {
    recordingLength.value = getMMSSfromS(getCurrentRecordingLength() / 1000);
  }
}

function addMarker() {
  waveform.addMarker('green');
  const id = currentSound?.markers?.length ?? 0;
  currentSound?.markers?.push({
    id: currentSound.markers.length,
    positionInMs: getCurrentRecordingLength(),
    name: 'marker ' + id,
  });
  console.log(currentSound?.markers);
}

watch(soundName, (newVal, oldVal) => {
  if (currentSound === null) return;
  currentSound.name = newVal;
  console.log(currentSound);
});
</script>

<style scoped>
.recorder-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  flex-wrap: nowrap;
  padding: 5px;
}
.recording-button-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  height: 100%;
  flex-wrap: nowrap;
  width: 100%;
  color: orange;
}
.recording-button {
  padding: 5px;
  width: 50%;
  font-size: 3rem;
  justify-content: center;
}
.recording-time-label {
  padding: 5px;
  width: 50%;
  font-size: 3rem;
  justify-content: center;
}
.meter-style {
  height: 30px;
  width: 100%;
}
.waveform-view {
  width: 100%;
  height: 200px;
  margin-top: 3px;
  margin-bottom: 3px;
  border-radius: 10px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.144);
}
.markers-panel {
  display: flex;
  flex-direction: row;
  width: 100%;
  padding: 5px;
  margin-top: 5px;
  margin-bottom: 5px;
}
.markers-button {
  width: 10%;
  height: 20px;
}
.markes-table {
  width: 90%;
  max-height: 200px;
  overflow-y: auto;
}
</style>
