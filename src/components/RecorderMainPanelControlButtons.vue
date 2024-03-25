<template>
  <div class="recording-button-row">
    <div class="stop-delete-button">
      <q-btn
        size="25px"
        round
        :color="recorderStore.getButtonsColor()"
        :icon="getStopButtonIcon()"
        @click="stopButtonClicked()"
      />
    </div>
    <div class="recording-button">
      <q-btn
        size="45px"
        round
        @click="recordButtonClicked()"
        :color="recorderStore.getButtonsColor()"
        :label="recordingLengthLabel"
      >
      </q-btn>
    </div>
    <div class="stop-delete-button">
      <q-btn
        size="25px"
        round
        :color="recorderStore.getButtonsColor()"
        icon="delete"
        @click="deleteButtonClicked()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Dialog } from 'quasar';
import { ref, onMounted } from 'vue';

import { getMMSSfromS } from 'src/scripts/math-helpers';
import { RecorderState } from 'src/components/models';
import { useRecorderStore } from 'src/stores/recorder-store';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
const recorderStore = useRecorderStore();
const soundLibraryStore = useSoundLibraryStore();

async function recordButtonClicked() {
  if (recorderStore.recorder.state === RecorderState.NOT_INITIALIZED) {
    await recorderStore.init();
  }
  if (recorderStore.recorder.state === RecorderState.RECORDING) {
    recorderStore.stopRecording();
  } else {
    recorderStore.startRecording();
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

onMounted(() => {
  setInterval(() => {
    updateTimeLabel();
  }, 100);
});

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
</script>

<style scoped>
.recording-button-row {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;

  width: 100%;
  padding: 5px;
}
.recording-button {
  padding: 5px;
  font-size: 2.8rem;
  justify-content: center;
}
.stop-delete-button {
  padding: 5px;
  font-size: 3rem;
  justify-content: center;
}
</style>
