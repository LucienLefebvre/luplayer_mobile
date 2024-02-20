<template>
  <div class="settings-panel">
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

    <div class="saved-playlist">
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
            ></q-btn>
            <q-btn
              icon="delete"
              class="deletePlaylistButton"
              @click="deleteButtonClicked(playlist)"
            ></q-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
.save-playlist-row {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
  padding: 3px;
}
.buttonRow {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
  padding: 3px;
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
  font-size: 18px;
}
.saved-playlist {
  max-height: 300px;
}
.playlistName {
  color: orange;
  font-size: 20px;
  padding: 10px;
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
}
.deletePlaylistButton {
  color: red;
  background-color: var(--blueColor);
  border-radius: 8px;
}
</style>
