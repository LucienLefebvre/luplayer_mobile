<template>
  <div>
    <TransitionGroup name="sound-items">
      <div v-for="sound in soundLibraryStore.recordedSounds" :key="sound.id">
        <div class="recorded-sound-row">
          <div class="recorded-sound-name">{{ sound.name }}</div>
          <div class="recorded-sound-time">
            {{ getMMSSfromS(sound.totalLengthInMs / 1000) }}
          </div>
          <div class="buttons">
            <q-btn
              color="green"
              :icon="getPlayButtonIcon(sound)"
              class="button play-button"
              size="xs"
              @click="playButtonClicked(sound)"
            />
            <q-btn
              color="red"
              icon="delete"
              class="button delete-button"
              @click="deleteButtonClicked(sound)"
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
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
import { Dialog } from 'quasar';
const soundLibraryStore = useSoundLibraryStore();

onMounted(() => {
  soundLibraryStore.getRecordedSounds();
});

function deleteButtonClicked(sound: RecordedSound) {
  Dialog.create({
    title: 'Delete sound',
    message: `Are you sure you want to delete this sound? "${sound.name}"`,
    style: 'background-color: var(--bkgColor); color: orange;',
    ok: {
      label: 'Yes',
      color: 'red',
    },
    cancel: {
      label: 'No',
      color: 'blue',
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
}
.recorded-sound-name {
  width: 60%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.recorded-sound-time {
  width: 10%;
  text-align: center;
}
.buttons {
  width: 30%;
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  padding: 2px;
}
.button {
  width: 15px;
  height: 15x;
}
</style>
