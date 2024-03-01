<template>
  <q-card class="panel-class">
    <q-card-section class="items-center question">
      <div class="centered-icon">
        <img
          src="~assets\icon.png"
          style="height: 30px; width: auto; object-fit: contain"
        />
      </div>
      <br />
      <div>
        <div class="orange-text">Thank you for trying LuPlayer Mobile !</div>
        <br />
        <div class="blue-text">
          This is a beta version.
          <br />
          <br />

          <div v-show="isCapacitor()">
            It has only been tested on Chrome for Android. For better
            performance, download the app from the Play Store.
          </div>
          <br />

          Please report any bugs to
          <a
            href="mailto:contact@luplayer.org"
            target="_blank"
            style="color: inherit"
            >contact@luplayer.org</a
          >
          or open an issue on
          <a
            href="https://github.com/LucienLefebvre/luplayer_mobile"
            target="_blank"
            style="color: inherit"
            >github</a
          >.
        </div>
      </div>
    </q-card-section>
    <q-card-section>
      <div class="checkbox-row">
        <q-checkbox
          v-model="checkBox"
          color="orange"
          label-class="checkbox-label"
          keep-color
        />
        <div class="blue-text">Don't show this message again</div>
      </div>
    </q-card-section>
    <q-card-actions align="right">
      <q-btn
        flat
        label="OK"
        color="secondary"
        v-close-popup
        @click="okButtonClicked"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSettingsStore } from 'src/stores/settings-store';

const settingsStore = useSettingsStore();

const checkBox = ref(true);

function okButtonClicked() {
  settingsStore.showWelcomeDialog = false;
  if (checkBox.value) {
    settingsStore.shouldShowWelcomeDialogNextTime = false;
    settingsStore.saveSettings();
  }
}

function isCapacitor() {
  return window.Capacitor;
}
</script>

<style scoped>
.panel-class {
  background-color: var(--bkgColor);
  padding: 5px;
  border-radius: 10px;
  overflow-y: auto;
  max-width: 100%;
  gap: 10px;
}
.centered-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
}
.orange-text {
  color: orange;
  padding-top: 5px;
  font-size: 1.1rem;
  text-align: center;
}
.blue-text {
  color: var(--blueColor);
  font: 1rem sans-serif;
}
.checkbox-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
.checkbox-label {
  color: var(--blueColor);
  font-size: 1rem;
}
</style>
