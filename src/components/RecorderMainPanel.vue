<template>
  <div>
    <PeakMeter
      :analyserObject="r.stereoAnalyser"
      class="meter-style"
      ref="peakMeter"
    />
    <div class="recording-button-row">
      <div class="recording-button-row-element">
        <q-btn size="xl" round @click="recordButtonClicked()" color="red">
          <q-icon :name="getRecordButtonIcon" size="xl" />
        </q-btn>
      </div>
      <div class="recording-button-row-element">{{ recordingLength }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Recorder } from 'src/scripts/recorder';
import { getMMSSfromS } from 'src/scripts/math-helpers';
import PeakMeter from './PeakMeter.vue';

const r = ref(new Recorder());

let intervalId: ReturnType<typeof setTimeout> | null = null;
const peakMeter = ref<typeof PeakMeter | null>(null);

onMounted(() => {
  intervalId = setInterval(() => {
    getRecordingLength();
  }, 100);
  peakMeter.value?.setAnalyserObject(r.value.stereoAnalyser);
});

function recordButtonClicked() {
  if (r.value.recorder?.state === 'recording') {
    r.value.stopRecording();
  } else {
    r.value.startRecording();
  }
}

const getRecordButtonIcon = computed(() => {
  if (r.value.recording) {
    return 'stop';
  }
  return '';
});

const recordingLength = ref('0');

function getRecordingLength() {
  if (!r.value.recording) {
    return getMMSSfromS(0);
  } else {
    recordingLength.value = getMMSSfromS(
      (Date.now() - r.value.startTime) / 1000
    );
  }
}
</script>

<style scoped>
.recording-button-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  height: 100%;
  flex-wrap: nowrap;

  color: var(--blueColor);
}
.recording-button-row-element {
  padding: 5px;
  width: 50%;
  font-size: 3rem;
  justify-content: center;
}
.meter-style {
  height: 30px;
  width: 100%;
}
</style>
