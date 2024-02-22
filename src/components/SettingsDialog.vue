<template>
  <div class="column settings-panel-dialog">
    <q-tabs v-model="tab" dense class="text-orange" indicator-color="orange">
      <q-tab name="file" label="File" icon="folder" />
      <q-tab name="settings" label="Settings" icon="settings" />
      <q-tab name="help" label="Help" icon="help" />
      <q-tab name="about" label="About" icon="info" />
    </q-tabs>
    <q-tab-panels v-model="tab" animated class="tab-panels">
      <q-tab-panel name="file" class="tab-panel">
        <SettingsDialogFile />
      </q-tab-panel>
      <q-tab-panel name="settings" class="tab-panel">
        <SettingsDialogPanel />
      </q-tab-panel>
      <q-tab-panel name="help" class="tab-panel">
        <SettingsDialogHelp />
      </q-tab-panel>
      <q-tab-panel name="about" class="tab-panel">
        <SettingsDialogAbout />
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SettingsDialogPanel from './SettingsDialogPanel.vue';
import SettingsDialogAbout from './SettingsDialogAbout.vue';
import SettingsDialogFile from './SettingsDialogFile.vue';
import SettingsDialogHelp from './SettingsDialogHelp.vue';

const tab = ref('file');
</script>

<style scoped>
.settings-panel-dialog {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;

  background-color: var(--bkgColor);
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}
.tab-panels {
  padding: 0px;
  background-color: var(--bkgColor);
  border-top: 1px solid orange;
}
.tab-panel {
  padding: 0px;
}
</style>
