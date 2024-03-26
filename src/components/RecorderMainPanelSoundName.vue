<template>
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
              v-model="recordedSoundVModel"
              autofocus
              dense
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
              v-model="recorderStore.currentSound.name"
              dense
              autofocus
              @keyup.enter="handleRecordingdSoundNameEnterKeyPressed"
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

import { RecorderState } from 'src/components/models';
import { useRecorderStore } from 'src/stores/recorder-store';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
const recorderStore = useRecorderStore();
const soundLibraryStore = useSoundLibraryStore();

const showNameDialog = ref(false);
function nameClicked() {
  const recorderState = recorderStore.recorder.state;

  if (
    recorderState === RecorderState.NOT_INITIALIZED ||
    recorderState === RecorderState.RECORDING ||
    recorderState === RecorderState.STOPPED ||
    recorderState === RecorderState.READY
  ) {
    recorderStore.currentSound.name = '';
  } else if (recorderState === RecorderState.PLAYING_RECORDED_SOUND) {
    if (soundLibraryStore.selectedSound)
      soundLibraryStore.selectedSound.name = '';
  }
  showNameDialog.value = !showNameDialog.value;
}

function getNameLabel() {
  const recorderState = recorderStore.recorder.state;

  if (
    recorderState === RecorderState.NOT_INITIALIZED ||
    recorderState === RecorderState.RECORDING ||
    recorderState === RecorderState.STOPPED ||
    recorderState === RecorderState.READY
  ) {
    return recorderStore.currentSound.name;
  } else if (recorderState === RecorderState.PLAYING_RECORDED_SOUND) {
    return soundLibraryStore.selectedSound?.name ?? 'Recording';
  } else {
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

const handleRecordingdSoundNameEnterKeyPressed = () => {
  if (recorderStore.currentSound.name.trim() !== '') {
    showNameDialog.value = false;
    recorderStore.currentSound.nameHasBeenEdited = true;
  }
};

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
  recorderStore.currentSound.nameHasBeenEdited = true;
};
</script>

<style scoped>
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
.clear-button {
  color: orange;
  background-color: transparent;
  width: 1rem;
  height: 1rem;
}
</style>
