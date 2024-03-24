<template>
  <div class="panel">
    <TransitionGroup name="sound-items">
      <div v-for="sound in soundLibraryStore.recordedSounds" :key="sound.id">
        <div class="recorded-sound-row">
          <q-btn
            color="orange"
            icon="edit"
            size="md"
            dense
            @click="renameButtonClicked(sound)"
          />
          <q-dialog
            v-model="sound.showNameDialog"
            auto-save
            :cover="false"
            :offset="[0, 20]"
            persistent
          >
            <q-card class="name-dialog" style="padding: 10px">
              <q-input
                :input-style="{
                  color: 'orange',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                }"
                color="orange"
                clearable
                v-model="sound.name"
                dense
                autofocus
                @keyup.enter="
                  sound.name.trim() !== ''
                    ? handleSoundNameDialogModelUpdate(sound)
                    : null
                "
              />
              <q-btn
                :disable="sound.name.trim() === ''"
                color="primary"
                label="Rename"
                @click="handleSoundNameDialogModelUpdate(sound)"
              />
            </q-card>
          </q-dialog>
          <div class="recorded-sound-name">{{ sound.name }}</div>
          <div class="recorded-sound-time">
            {{ getMMSSfromS(sound.totalLengthInMs / 1000) }}
          </div>
          <div class="buttons">
            <q-btn
              color="red"
              icon="delete"
              size="md"
              dense
              @click="deleteButtonClicked(sound)"
            />
            <q-btn
              color="green"
              :icon="getPlayButtonIcon(sound)"
              size="md"
              @click="playButtonClicked(sound)"
              dense
            />
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { RecordedSound } from 'src/components/models';
import { getMMSSfromS } from 'src/scripts/math-helpers';
import { onMounted, ref } from 'vue';
import { Dialog } from 'quasar';
import { RecorderState } from 'src/components/models';
import { useRecorderStore } from 'src/stores/recorder-store';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
const recorderStore = useRecorderStore();
const soundLibraryStore = useSoundLibraryStore();

onMounted(() => {
  soundLibraryStore.getRecordedSounds();
});

function renameButtonClicked(sound: RecordedSound) {
  sound.showNameDialog = true;
}

function handleSoundNameDialogModelUpdate(sound: RecordedSound) {
  sound.showNameDialog = false;
  soundLibraryStore.updateSoundName(sound, sound.name);
}

function deleteButtonClicked(sound: RecordedSound) {
  Dialog.create({
    title: `Delete "${sound.name}" ?`,
    style: 'background-color: var(--bkgColor); color: orange;',
    ok: {
      label: 'Yes',
      color: 'red',
    },
    cancel: {
      label: 'No',
      color: 'primary',
    },
  }).onOk(() => {
    soundLibraryStore.deleteRecordedSoundFromLibrary(sound);
  });
}

function getPlayButtonIcon(sound: RecordedSound) {
  if (sound.audioElement) {
    return sound.isPlaying ? 'pause' : 'play_arrow';
  } else {
    return 'play_arrow';
  }
}
async function playButtonClicked(sound: RecordedSound) {
  if (recorderStore.recorder?.state === RecorderState.RECORDING) {
    return;
  }
  if (soundLibraryStore.selectedSound !== sound) {
    if (!(await soundLibraryStore.setSelectedSound(sound))) return;
  }

  if (sound.audioElement) {
    if (sound.isPlaying) {
      soundLibraryStore.pauseSelectedSound();
    } else {
      soundLibraryStore.playSelectedSound();
    }
  }
}
</script>

<style scoped>
.panel {
  padding: 5px;
}
.sound-items-move {
  transition: 0.3s ease;
}
.sound-items-enter-active {
  transition: all 0.3s ease;
}
.sound-items-leave-active {
  position: absolute;
  transition: all 0.3s ease;
}

.sound-items-leave-to {
  opacity: 0;
  transform: translateX(200%);
}
.sound-items-enter-from {
  opacity: 0;
  transform: scale(0.1);
}

.recorded-sound-row {
  max-width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--blueColor);
  gap: 3px;
}
.recorded-sound-name {
  width: 60%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.recorded-sound-time {
  max-width: 10%;
  text-align: right;
}
.buttons {
  width: 20%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 7px;
}
.name-dialog {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  background-color: var(--bkgColor);
  margin: 5px;
  gap: 10px;
}
</style>
