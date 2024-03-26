<template>
  <div class="panel">
    <TransitionGroup name="sound-items">
      <div v-for="sound in soundLibraryStore.recordedSounds" :key="sound.id">
        <div class="recorded-sound-row-tiny" v-if="props.mode === 'tiny'">
          <q-btn
            color="orange"
            icon="edit"
            size="sm"
            dense
            @click="renameButtonClicked(sound)"
          />

          <div class="recorded-sound-name">{{ sound.name }}</div>
          <div class="recorded-sound-time">
            {{ getMMSSfromS(sound.totalLengthInMs / 1000) }}
          </div>
          <div class="buttons">
            <q-btn
              color="red"
              icon="delete"
              size="sm"
              dense
              @click="deleteButtonClicked(sound)"
            />
            <q-btn
              color="green"
              :icon="getPlayButtonIcon(sound)"
              size="sm"
              @click="playButtonClicked(sound)"
              dense
            />
          </div>
        </div>
        <div class="recorded-sound-row-large" v-if="props.mode === 'large'">
          <q-card class="large-card bg">
            <div class="card-row">
              <div class="file-info">
                {{ soundLibraryStore.getFileSizeInMBAsString(sound) }}
              </div>
              <div class="recorded-sound-name-large" color="orange">
                <q-btn
                  color="orange"
                  icon="edit"
                  size="sm"
                  dense
                  @click="renameButtonClicked(sound)"
                />
                {{ sound.name }}
              </div>
              <div class="recorded-sound-time">
                {{ getMMSSfromS(sound.totalLengthInMs / 1000) }}
              </div>
            </div>
            <div class="card-row">
              <q-btn
                color="red"
                icon="delete"
                size="md"
                dense
                @click="deleteButtonClicked(sound)"
              />
              <div class="date-label">
                {{ getDateLabel(new Date(sound.createdTimestamp)) }}
              </div>
              <q-btn
                color="green"
                :icon="getPlayButtonIcon(sound)"
                size="md"
                @click="playButtonClicked(sound)"
                dense
              />
            </div>

            <div class="buttons"></div>
          </q-card>
        </div>
        <q-dialog
          v-model="sound.showNameDialog"
          auto-save
          :cover="false"
          :offset="[0, 20]"
          persistent
        >
          <div class="name-dialog">
            <q-card class="name-dialog-panel" style="padding: 10px">
              <q-input
                :input-style="{
                  color: 'orange',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                }"
                color="orange"
                v-model="sound.name"
                dense
                autofocus
                @keyup.enter="handleSoundNameDialogModelUpdate(sound)"
              />
            </q-card>
            <q-btn
              color="secondary"
              icon="done"
              size="lg"
              dense
              @click="handleSoundNameDialogModelUpdate(sound)"
            />
          </div>
        </q-dialog>
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

const props = defineProps<{
  mode: 'tiny' | 'large';
}>();

onMounted(() => {
  soundLibraryStore.getRecordedSounds();
});

function renameButtonClicked(sound: RecordedSound) {
  if (!sound.nameHasBeenEdited) sound.name = '';
  sound.showNameDialog = true;
}

function handleSoundNameDialogModelUpdate(sound: RecordedSound) {
  if (sound.name.trim() !== '') {
    sound.showNameDialog = false;
    soundLibraryStore.updateSoundName(sound, sound.name);
    sound.nameHasBeenEdited = true;
  }
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

function getDateLabel(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  const formattedDate = `${month}/${day}/${year} - ${hours}:${minutes}`;
  return formattedDate;
}
</script>

<style scoped>
.panel {
  padding: 5px;
  width: 100%;
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

.recorded-sound-row-tiny {
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
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 12px;
}
.name-dialog {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;
  margin: 5px;
  gap: 10px;
}
.name-dialog-panel {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  background-color: var(--bkgColor);
}
.recorded-sound-row-large {
  width: 100%;
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
.large-card {
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  align-items: center;
  padding: 5px;
  font-size: 1.1rem;
  font-weight: bold;
  background-color: var(--bkgColor);
  border-radius: 10px;
  gap: 3px;
  width: 100%;
  border: 1px solid var(--blueColor);
}
.card-row > div {
  flex: 0 0 15%;
}
.recorded-sound-name-large {
  flex: 0 0 70% !important;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: orange;
  display: flex;
  justify-content: center;
  text-align: center;
  align-items: center;
  gap: 5px;
  font-size: 1.1rem;
}
.file-info {
  font-size: 1rem;
}
.card-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
}

.date-label {
  flex: 0 0 70% !important;
  color: var(--blueColor);
  font-size: 1rem;
  text-align: center;
}
</style>
