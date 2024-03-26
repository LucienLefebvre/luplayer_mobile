<template>
  <div class="file-format-panel">
    <div class="file-format-row">
      <div>Input device</div>
      <q-btn-dropdown
        color="primary"
        :disable="recorderStore.recorder.state === RecorderState.RECORDING"
        class="dropdown-button"
      >
        <template v-slot:label
          ><div class="ellipsis">
            {{ getInputButtonDeviceLabel() }}
          </div></template
        >
        <q-list class="dropdown-button-list">
          <div v-for="device in inputDevices" :key="device.deviceId">
            <q-item
              clickable
              v-close-popup
              @click="deviceItemClicked(device)"
              :style="getDeviceItemStyle(device.deviceId)"
            >
              <q-item-section>
                <q-item-label>{{ getInputDeviceLabel(device) }}</q-item-label>
              </q-item-section></q-item
            >
          </div>
        </q-list>
      </q-btn-dropdown>
    </div>
    <div class="file-format-row">
      <div>Audio format (need restart)</div>
      <q-btn-dropdown
        :label="settingsStore.recorder.fileFormat"
        color="primary"
        :disable="recorderStore.recorder.state === RecorderState.RECORDING"
      >
        <q-list class="dropdown-button-list">
          <q-item
            clickable
            v-close-popup
            @click="formatItemClicked('wav')"
            :style="getFormatItemStyle('wav')"
            ><q-item-section>
              <q-item-label>WAV</q-item-label>
            </q-item-section></q-item
          >
          <!-- <q-item
            clickable
            v-close-popup
            @click="formatItemClicked('mp3')"
            :style="getFormatItemStyle('mp3')"
            ><q-item-section>
              <q-item-label>MP3</q-item-label>
            </q-item-section></q-item
          > -->
          <q-item
            clickable
            v-close-popup
            @click="formatItemClicked('ogg')"
            :style="getFormatItemStyle('ogg')"
            ><q-item-section>
              <q-item-label>OGG (OPUS)</q-item-label>
            </q-item-section></q-item
          >
        </q-list>
      </q-btn-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useSettingsStore } from 'src/stores/settings-store';
import { useRecorderStore } from 'src/stores/recorder-store';
import { RecorderState } from './models';
const settingsStore = useSettingsStore();
const recorderStore = useRecorderStore();

const inputDevices = ref<MediaDeviceInfo[]>([]);

onMounted(() => {
  inputDevices.value = getInputDevices();

  navigator.mediaDevices.ondevicechange = async () => {
    inputDevices.value = getInputDevices();
  };
});

function getInputDevices(): MediaDeviceInfo[] {
  return recorderStore.recorder.audioInputDevices ?? [];
}

function getInputButtonDeviceLabel(): string {
  const deviceLabel = recorderStore.recorder.currentAudioInputDevice?.label;
  console.log('deviceLabel', deviceLabel);
  if (deviceLabel === '') return 'Default';
  else if (deviceLabel) return deviceLabel;
  else return 'Audio not initialized';
}

function getDeviceItemStyle(deviceId: string) {
  return recorderStore.recorder.currentAudioInputDevice?.deviceId === deviceId
    ? 'background-color: var(--orangeColor); color: white'
    : 'background-color: var(--blueColor); color: white';
}

function getInputDeviceLabel(device: MediaDeviceInfo) {
  if (device.deviceId === 'default') return 'Default';
  return device.label ?? 'Unknown';
}

async function deviceItemClicked(device: MediaDeviceInfo) {
  await recorderStore.recorder.changeInputDevice(device.deviceId);
}

function formatItemClicked(format: 'wav' | 'mp3' | 'ogg') {
  settingsStore.recorder.fileFormat = format;
  settingsStore.saveSettings();
  recorderStore.recorder.init();
}

function getFormatItemStyle(format: 'wav' | 'mp3' | 'ogg') {
  return settingsStore.recorder.fileFormat === format
    ? 'background-color: var(--orangeColor); color: white'
    : 'background-color: var(--blueColor); color: white';
}
</script>

<style scoped>
.file-format-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  width: 100%;
}
.file-format-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
  font-size: 1rem;
  font-weight: bold;
  color: orange;
  gap: 3px;
}
.file-format-row > div {
  flex: 0 0 120px;
}
.dropdown-button {
  flex: 1;
  max-width: 50%;
}

.dropdown-button-list {
  flex: 1;
  background-color: var(--bkgColor);
  color: var(--blueColor);
}
</style>
