<template>
  <div class="markers-panel">
    <div class="markers-control" key="m">
      <div class="markers-control-label">Markers</div>
      <q-btn
        v-if="recorderStore.recorder.state === RecorderState.RECORDING"
        @click="recorderStore.addMarker()"
        color="secondary"
        icon="add"
        size="md"
        dense
      />
    </div>
    <div class="markers-display">
      <TransitionGroup
        :name="markersTransitionEnabled ? 'markers-transition' : ''"
      >
        <div
          v-for="(marker, index) in recorderStore.getMarkerArray()"
          :key="marker.id"
          class="markers-table"
        >
          <div class="markers-table-id">
            {{ recorderStore.getMarkerArray().length - index }}
          </div>
          <div class="markers-table-button">
            <q-btn
              v-if="recorderStore.recorder.state === RecorderState.RECORDING"
              color="orange"
              icon="edit"
              size="xs"
              dense
              @click="markerClicked(marker)"
            />
            <q-dialog
              v-model="marker.showDialog"
              auto-save
              :cover="false"
              :offset="[0, 20]"
            >
              <q-card class="name-dialog-panel q-pa-md" style="padding: 10px">
                <q-input
                  :input-style="{ color: 'orange', fontSize: '1.5rem' }"
                  color="orange"
                  clearable
                  v-model="marker.name"
                  dense
                  autofocus
                  @keyup.enter="
                    marker.name.trim() !== ''
                      ? (marker.showDialog = false)
                      : null
                  "
                />
              </q-card>
            </q-dialog>
          </div>
          <div class="markers-table-name">
            {{ marker.name }}
          </div>

          <div class="markers-table-time">
            {{ getMMSSfromS(marker.positionInMs / 1000) }}
          </div>
          <div class="markers-table-button">
            <q-btn
              v-if="recorderStore.recorder.state === RecorderState.RECORDING"
              color="red"
              icon="delete"
              size="xs"
              dense
              @click="recorderStore.deleteMarker(marker)"
            />
            <q-btn
              v-if="
                recorderStore.recorder.state ===
                RecorderState.PLAYING_RECORDED_SOUND
              "
              color="green"
              icon="play_arrow"
              size="xs"
              dense
              @click="markerPlayButtonClicked(marker)"
            />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, TransitionGroup, computed } from 'vue';
import { RecorderState } from 'src/components/models';
import { SoundMarker } from './models';
import { getMMSSfromS } from 'src/scripts/math-helpers';
import { useRecorderStore } from 'src/stores/recorder-store';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';

const recorderStore = useRecorderStore();
const soundLibraryStore = useSoundLibraryStore();

const markersTransitionEnabled = computed(() => {
  return recorderStore.recorder.state === RecorderState.RECORDING;
});

function markerClicked(marker: SoundMarker) {
  if (!marker.nameHasBeenEdited) {
    marker.name = '';
    marker.nameHasBeenEdited = true;
  }
  marker.showDialog = !marker.showDialog;
}

function markerPlayButtonClicked(marker: SoundMarker) {
  const audioElement = soundLibraryStore.selectedSound?.audioElement;
  if (audioElement) {
    audioElement.currentTime = marker.positionInMs / 1000;
    if (audioElement.paused) {
      soundLibraryStore.playSelectedSound();
    }
  }
}

watch(
  () => soundLibraryStore.selectedSound?.markers,
  (markers) => {
    if (
      soundLibraryStore.selectedSound !== null &&
      markers !== undefined &&
      recorderStore.waveform !== undefined
    ) {
      recorderStore.waveform?.setMarkers(
        soundLibraryStore.selectedSound.markers
      );
    }
  },
  { deep: true }
);
</script>

<style scoped>
.markers-panel {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  align-items: center;
  width: 100%;
  padding: 3px;
  height: 90px;
}
.markers-control {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 5px;
  width: 20%;
}
.markers-control-label {
  font-size: 1rem;
  font-weight: bold;
  color: orange;
}
.markers-display {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 65%;
  background-color: rgba(0, 0, 0, 0.137);
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  padding: 5px;
}
.markers-table {
  font-size: 1.1rem;
  font-weight: bold;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
.markers-table-id {
  width: 5%;
  text-align: left;
  color: var(--blueColor);
}
.markers-table-name {
  display: flex;
  justify-content: left;
  align-items: center;
  color: orange;
  width: 75%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: left;
}
.markers-table-button {
  margin-left: 5px;
  margin-right: 5px;
}
.markers-table-time {
  width: 15%;
  text-align: right;
  color: var(--blueColor);
}
.markers-transition-move {
  transition: 0.3s ease;
}
.markers-transition-enter-active {
  transition: all 0.3s ease;
}
.markers-transition-leave-active {
  position: absolute;
  transition: all 0.3s ease;
}
.markers-transition-leave-to {
  opacity: 0;
  transform: scale(0.1);
}
.markers-transition-enter-from {
  opacity: 0;
  transform: scale(0.1);
}
</style>
