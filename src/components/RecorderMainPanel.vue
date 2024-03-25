<template>
  <div>
    <PeakMeter class="meter-style" ref="peakMeter" />
    <div class="recorder-panel">
      <div
        class="waveform-view not-initialized-waveform"
        :style="{ height: waveformViewHeight }"
        v-if="recorderStore.recorder.state === RecorderState.NOT_INITIALIZED"
        @click="recorderStore.init()"
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
        <RecorderMainPanelAudioControls />
        <RecorderMainPanelControlButtons />
        <RecorderMainPanelSoundName />
        <RecorderMainPanelMarkers v-if="settingsStore.recorder.showMarkers" />

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
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue';

import PeakMeter from './PeakMeter.vue';
import RecorderMainPanelControlButtons from './RecorderMainPanelControlButtons.vue';
import RecorderMainPanelSoundName from './RecorderMainPanelSoundName.vue';
import RecorderMainPanelMarkers from './RecorderMainPanelMarkers.vue';
import RecorderMainPanelAudioControls from './RecorderMainPanelAudioControls.vue';
import RecordedSoundsPanel from './RecordedSoundsPanel.vue';

import { RecorderState } from 'src/components/models';
import { useRecorderStore } from 'src/stores/recorder-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';

const recorderStore = useRecorderStore();
const soundLibraryStore = useSoundLibraryStore();
const settingsStore = useSettingsStore();

const waveformView = ref<HTMLDivElement | null>(null);
const peakMeter = ref<typeof PeakMeter | null>(null);

onMounted(() => {
  recorderStore.waveformView = waveformView.value;
});

async function init() {
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

const showRecordedSoundsDialog = ref(false);
function openRecordedSoundsDialog() {
  showRecordedSoundsDialog.value = true;
}

watch(
  () => soundLibraryStore.selectedSoundChanged,
  async (newValue) => {
    console.log('selected sound changed');
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
    recorderStore.recorder.setTrimGain(newValue);
  }
);

watch(
  () => recorderStore.recorder.state,
  (state) => {
    if (state === RecorderState.PLAYING_RECORDED_SOUND) {
      recorderStore.waveform?.setShouldUpdateWaveform(false);
    } else {
      recorderStore.waveform?.setShouldUpdateWaveform(true);
    }
    if (state === RecorderState.READY) {
      peakMeter.value?.setAnalyserObject(recorderStore.recorder.stereoAnalyser);
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
</style>
