<template>
  <div class="column settings-panel">
    <div class="close-button">
      <q-btn
        @click="soundsStore.showSettingsWindow = false"
        icon="close"
        color="white"
        flat
        round
        dense
        size="20px"
      />
    </div>
    <q-card class="card-class">
      <div class="settings-panel">
        <div class="settings-row">
          <div class="settings-label">Keep screen awake</div>
          <q-toggle v-model="settingsStore.keepScreenAwake" color="orange" />
        </div>
        <div class="settings-row">
          <div class="settings-label">Players height</div>
          <q-slider
            style="height: 100%; width: 60%"
            v-model="settingsStore.playerHeightFactor"
            :min="0"
            :max="2"
            :step="0.01"
            color="orange"
          />
        </div>
        <div class="settings-row">
          <div class="settings-label">Auto scroll to selected sound</div>
          <q-toggle v-model="settingsStore.autoScroll" color="orange" />
        </div>
        <q-separator class="separator" size="1px" color="blue" />
        <div class="settings-row">
          <div class="settings-label">Invert fader side</div>
          <q-toggle v-model="settingsStore.faderIsOtherSide" color="orange" />
        </div>
        <div class="settings-row">
          <div class="settings-label">Fader curve</div>
          <q-slider
            style="height: 100%; width: 60%"
            v-model="settingsStore.faderSkewFactor"
            :min="1.01"
            :max="10"
            :step="0.01"
            color="orange"
          />
        </div>
        <div class="settings-row">
          <div class="settings-label">Fader stop</div>
          <q-toggle v-model="settingsStore.faderStop" color="orange" />
        </div>
        <q-separator class="separator" size="1px" color="blue" />
        <div class="settings-row">
          <div class="settings-label">Auto normalize</div>
          <q-toggle
            v-model="settingsStore.autoNormalize"
            color="orange"
            type="number"
          />
        </div>
        <div class="settings-row">
          <div class="settings-label">Normalization target (LU)</div>

          <q-input
            v-model="settingsStore.normalizationLuTarget"
            type="number"
            input-class="text-center text-orange"
            style="
              width: 50px;
              color: orange;
              background-color: var(--bkgColor);
            "
            borderless
          />
        </div>
        <q-separator class="separator" size="1px" color="blue" />
        <div class="settings-row">
          <div class="settings-label">Show peak meter</div>
          <q-toggle v-model="settingsStore.showPeakMeter" color="orange" />
        </div>
        <div class="settings-row">
          <div class="settings-label">Show LU meter</div>
          <q-toggle v-model="settingsStore.showLuMeter" color="orange" />
        </div>
        <div class="settings-row">
          <div class="settings-label">Peak meter orange threshold (-dbFS)</div>

          <q-input
            v-model="settingsStore.peakMeterOrangeThreshold"
            type="number"
            input-class="text-center text-orange"
            style="
              width: 50px;
              color: orange;
              background-color: var(--bkgColor);
            "
          />
        </div>
        <div class="settings-row">
          <div class="settings-label">Peak meter red threshold (-dbFS)</div>

          <q-input
            v-model="settingsStore.peakMeterRedThreshold"
            type="number"
            input-class="text-center text-orange"
            style="
              width: 50px;
              color: orange;
              background-color: var(--bkgColor);
            "
          />
        </div>
      </div>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { watch, watchEffect } from 'vue';
import { useSettingsStore } from 'src/stores/settings-store';
import { useSoundsStore } from 'src/stores/sounds-store';

const settingsStore = useSettingsStore();
const soundsStore = useSoundsStore();

watchEffect(() => {
  settingsStore.saveSettings();
});

watch(
  () => settingsStore.normalizationLuTarget,
  (newValue: any) => {
    settingsStore.normalizationLuTarget = parseFloat(newValue);
  }
);

watch(
  () => settingsStore.peakMeterOrangeThreshold,
  (newValue: any) => {
    settingsStore.peakMeterOrangeThreshold = parseFloat(newValue);
  }
);

watch(
  () => settingsStore.peakMeterRedThreshold,
  (newValue: any) => {
    settingsStore.peakMeterRedThreshold = parseFloat(newValue);
  }
);
</script>

<style scoped>
.close-button {
  display: flex;
  justify-content: center;
  align-items: center;
}
.soundDetailsBackground {
  border: 1px solid;
  border-radius: 10px;

  background-color: var(--bkgColor);
  width: 90%;
}
.card-class {
  background-color: var(--bkgColor);
  color: white;
  padding: 5px;
  border-radius: 10px;
  overflow-y: auto;
  max-width: 100%;
  width: 100%;
}
.settings-panel {
  display: flex;
  flex-direction: column;
}
.settings-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 2px;
  font-size: 15px;
  color: orange;

  max-width: 100%;
}
.settings-label {
  padding-right: 10px;
}
.separator {
  margin-top: 5px;
  margin-bottom: 5px;
  color: var(--blueColor);
}
</style>
