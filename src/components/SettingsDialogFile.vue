<template>
  <div class="settings-panel">
    <div class="section-name">Save playlist :</div>
    <div class="save-playlist-row">
      <q-input
        bottom-slots
        v-model="playlistName"
        input-class="text-orange font-roboto"
        class="text-orange nameInput font-roboto"
        style="color: orange"
        dense
        placeholder="Enter playlist name..."
        @keyup.enter="saveButtonClicked"
      >
        <template v-slot:append>
          <q-btn
            flat
            round
            dense
            icon="save"
            @click="saveButtonClicked"
            color="primary"
            :disable="!isSaveButtonEnabled()"
          ></q-btn>
        </template>
      </q-input>
    </div>

    <div v-if="getSavedPlaylists().length > 0">
      <div class="section-name">Load playlist :</div>
      <div class="saved-playlist">
        <TransitionGroup name="playlists-group">
          <div v-for="playlist in savedPlaylists" :key="playlist">
            <div class="buttonRow">
              <div class="playlistName font-roboto">
                {{ playlist }}
              </div>
              <div class="playlist-buttons">
                <q-btn
                  icon="folder_open"
                  class="openPlaylistButton"
                  @click="openButtonClicked(playlist)"
                  size="sm"
                ></q-btn>
                <q-btn
                  icon="add"
                  class="openPlaylistButton"
                  @click="addButtonClicked(playlist)"
                  size="sm"
                ></q-btn>
                <q-btn
                  icon="delete"
                  class="deletePlaylistButton"
                  @click="deleteButtonClicked(playlist)"
                  size="sm"
                ></q-btn>
              </div>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>
    <div class="section-name">Clear playlist :</div>
    <div class="buttonRow">
      <q-btn
        label="Clear all sounds"
        color="red"
        @click="clearSoundsClicked()"
        class="font-roboto"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, TransitionGroup } from 'vue';
import { useSoundsStore } from 'src/stores/sounds-store';
import { Notify, Dialog } from 'quasar';

const soundsStore = useSoundsStore();

onMounted(() => {
  savedPlaylists.value = getSavedPlaylists();
});

const playlistName = ref('');
function saveButtonClicked() {
  if (soundsStore.checkIfThereAreLoadedSounds() === false) {
    Notify.create({
      message: 'No sounds in playlist',
      color: 'red',
      position: 'top',
    });
    return;
  }

  if (getSavedPlaylists().includes(playlistName.value)) {
    Notify.create({
      message: 'Playlist name already exists',
      color: 'red',
      position: 'top',
    });
    return;
  }

  soundsStore.savePlaylist(playlistName.value);
}

function isSaveButtonEnabled() {
  return playlistName.value.length > 0;
}

function openButtonClicked(playlist: string) {
  if (soundsStore.checkIfThereAreLoadedSounds()) {
    Dialog.create({
      title: 'Open playlist',
      message:
        'Are you sure you want to open a new playlist? All unsaved changes will be lost.',
      style: 'background-color: var(--bkgColor); color: orange;',
      ok: {
        push: true,
        color: 'orange',
        label: 'Open',
      },
      cancel: {
        push: true,
        color: 'red',
        label: 'Cancel',
      },
    }).onOk(() => {
      soundsStore.loadPlaylist(playlist, false);
    });
  } else {
    soundsStore.loadPlaylist(playlist, false);
  }
}

function addButtonClicked(playlist: string) {
  Dialog.create({
    title: 'Import playlist',
    message: 'Add selected playlist to current playlist?',
    style: 'background-color: var(--bkgColor); color: orange;',
    ok: {
      push: true,
      color: 'orange',
      label: 'Import',
    },
    cancel: {
      push: true,
      color: 'red',
      label: 'Cancel',
    },
  }).onOk(() => {
    soundsStore.loadPlaylist(playlist, true);
  });
}

function deleteButtonClicked(playlist: string) {
  Dialog.create({
    title: 'Delete playlist',
    message: `Are you sure you want to delete playlist "${playlist}"?`,
    style: 'background-color: var(--bkgColor); color: orange;',
    ok: {
      push: true,
      color: 'red',
      label: 'Delete',
    },
    cancel: {
      push: true,
      color: 'orange',
      label: 'Cancel',
    },
  }).onOk(async () => {
    await soundsStore.deletePlaylist(playlist);
    savedPlaylists.value = getSavedPlaylists();
  });
}

const savedPlaylists = ref('[]');
function getSavedPlaylists() {
  return JSON.parse(localStorage.getItem('savedPlaylists') || '[]');
}

function clearSoundsClicked() {
  if (soundsStore.checkIfThereArePlayingSounds()) {
    Notify.create({
      message: "Can't clear the playlist while sounds are playing",
      type: 'negative',
      position: 'top',
      timeout: 1000,
    });
    return;
  }

  Dialog.create({
    title: 'Clear all sounds ?',
    style: 'background-color: var(--bkgColor); color: orange;',
    ok: {
      push: true,
      color: 'red',
      label: 'Clear',
    },
    cancel: {
      push: true,
      color: 'orange',
      label: 'Cancel',
    },
  }).onOk(() => {
    soundsStore.deleteAllSounds(false);
    soundsStore.showSettingsWindow = false;
  });
}
</script>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;

  background-color: var(--bkgColor);
  justify-content: center;
  border: 0px;
  padding: 10px;
}
.section-name {
  font-size: 1rem;
  color: var(--blueColor);
  font-weight: 500;
  text-transform: uppercase;
}
.save-playlist-row {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
}
.buttonRow {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
  padding: 5px;
}
.playlist-buttons {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  flex-wrap: nowrap;
  padding: 3px;
  width: 45%;
}
.nameInput {
  width: 80%;
  font-size: 1.2rem;
}
.saved-playlist {
  max-height: 300px;
  overflow-y: auto;
}
.playlistName {
  color: orange;
  font-size: 1.2rem;
  padding: 5px;
  border-radius: 5px;
  width: 55%;
}
.font-roboto {
  font-family: 'Roboto', sans-serif;
}
.openPlaylistButton {
  color: orange;
  background-color: var(--blueColor);
  border-radius: 8px;
  width: 35px;
}
.deletePlaylistButton {
  color: red;
  background-color: var(--blueColor);
  border-radius: 8px;
  width: 35px;
}
.playlists-group-move {
  transition: 0.3s ease;
  transition-delay: 0.2s;
}
.playlists-group-enter-active {
  transition: none;
}
.playlists-group-leave-active {
  transition: all 0.3s ease;
}

.playlists-group-leave-to {
  opacity: 0;
  transform: scale(0.1);
}
.playlists-group-leave-active {
  position: absolute;
}
</style>
