<template>
  <div class="settings-panel">
    <q-expansion-item
      expand-separator
      label="Display"
      class="settings-part-name"
      group="settings-item-group"
    >
      <div class="settings-row">
        <div class="settings-label">Keep screen awake</div>
        <q-toggle v-model="settingsStore.keepScreenAwake" color="orange" />
      </div>
      <div class="settings-row">
        <div class="settings-label">Playlist waveform size</div>
        <q-slider
          class="settings-slider"
          v-model="settingsStore.playlistWaveformHeightFactor"
          :min="0"
          :max="2"
          :step="0.01"
          color="orange"
        />
      </div>
      <div class="settings-row">
        <div class="settings-label">Playlist sound name size</div>
        <q-slider
          class="settings-slider"
          v-model="settingsStore.playlistSoundNameHeightFactor"
          :min="0.5"
          :max="2"
          :step="0.01"
          color="orange"
        />
      </div>

      <div
        class="settings-row"
        v-show="settingsStore.cartIsDifferentHeightThanPlaylist"
      >
        <div class="settings-label">Cart waveform size</div>
        <q-slider
          class="settings-slider"
          v-model="settingsStore.cartWaveformHeightFactor"
          :min="0"
          :max="2"
          :step="0.01"
          color="orange"
        />
      </div>
      <div
        class="settings-row"
        v-show="settingsStore.cartIsDifferentHeightThanPlaylist"
      >
        <div class="settings-label">Cart name size</div>
        <q-slider
          class="settings-slider"
          v-model="settingsStore.cartSoundNameHeightFactor"
          :min="0.5"
          :max="2"
          :step="0.01"
          color="orange"
        />
      </div>
      <div class="settings-row">
        <div class="settings-label">Auto scroll to selected sound</div>
        <q-toggle v-model="settingsStore.autoScroll" color="orange" />
      </div>
      <!-- <div class="settings-row">
        <div class="settings-label">Display playlist controls</div>
        <q-toggle
          v-model="settingsStore.displayPlaylistControls"
          color="orange"
        />
      </div> -->
    </q-expansion-item>
    <q-expansion-item
      expand-separator
      label="Play / Stop"
      class="settings-part-name"
      group="settings-item-group"
    >
      <div class="settings-row">
        <div class="settings-label">Select last played cart sound</div>
        <q-toggle
          v-model="settingsStore.selectLastPlayedCartSound"
          color="orange"
        />
      </div>
      <div class="settings-row">
        <div class="settings-label">Double tap to stop</div>
        <q-toggle v-model="settingsStore.doubleTapToStop" color="orange" />
      </div>
      <div class="settings-row">
        <div class="settings-label">False start time (ms)</div>
        <q-input
          v-model="settingsStore.falseStartTime"
          type="number"
          input-class="text-center text-orange"
          style="width: 50px; color: orange; background-color: var(--bkgColor)"
          borderless
        />
      </div>
    </q-expansion-item>

    <q-expansion-item
      expand-separator
      label="Fader"
      class="settings-part-name"
      group="settings-item-group"
    >
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
        <div class="settings-label">Fader stop in playlist mode</div>
        <q-toggle v-model="settingsStore.faderStop" color="orange" />
      </div>
    </q-expansion-item>
    <q-expansion-item
      expand-separator
      label="Normalization"
      class="settings-part-name"
      group="settings-item-group"
    >
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
          style="width: 50px; color: orange; background-color: var(--bkgColor)"
          borderless
        />
      </div>
    </q-expansion-item>
    <q-expansion-item
      expand-separator
      label="Meter"
      class="settings-part-name"
      group="settings-item-group"
    >
      <div class="settings-row">
        <div class="settings-label">Show peak meter</div>
        <q-toggle v-model="settingsStore.showPeakMeter" color="orange" />
      </div>
      <!--         <div class="settings-row">
          <div class="settings-label">Show LU meter</div>
          <q-toggle v-model="settingsStore.showLuMeter" color="orange" />
        </div> -->
      <div class="settings-row">
        <div class="settings-label">Peak meter orange threshold (-dbFS)</div>

        <q-input
          v-model="settingsStore.peakMeterOrangeThreshold"
          type="number"
          input-class="text-center text-orange"
          style="width: 50px; color: orange; background-color: var(--bkgColor)"
        />
      </div>
      <div class="settings-row">
        <div class="settings-label">Peak meter red threshold (-dbFS)</div>

        <q-input
          v-model="settingsStore.peakMeterRedThreshold"
          type="number"
          input-class="text-center text-orange"
          style="width: 50px; color: orange; background-color: var(--bkgColor)"
        />
      </div>
    </q-expansion-item>
    <q-expansion-item
      expand-separator
      label="Performance"
      class="settings-part-name"
      group="settings-item-group"
    >
      <div class="settings-row">
        <div class="settings-label">Performance mode (need restart)</div>
        <q-btn-dropdown
          flat
          :label="getPerformanceLabel()"
          class="q-mr-sm"
          style="color: orange"
          transition-duration="100"
        >
          <q-list style="background-color: var(--bkgColor)">
            <q-item
              clickable
              v-close-popup
              @click="settingsStore.audioContextLatencyHint = 'playback'"
              :style="{
                'background-color':
                  settingsStore.audioContextLatencyHint === 'playback'
                    ? 'orange'
                    : 'var(--bkgColor)',
              }"
            >
              <q-item-section>
                <q-item-label class="listLabel">Best performance</q-item-label>
              </q-item-section>
            </q-item>
            <q-item
              clickable
              v-close-popup
              @click="settingsStore.audioContextLatencyHint = 'interactive'"
              :style="{
                'background-color':
                  settingsStore.audioContextLatencyHint === 'interactive'
                    ? 'orange'
                    : 'var(--bkgColor)',
              }"
            >
              <q-item-section>
                <q-item-label class="listLabel">Minimize latency</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>
    </q-expansion-item>
  </div>
</template>

<script setup lang="ts">
import { watch, watchEffect } from 'vue';
import { useSettingsStore } from 'src/stores/settings-store';
import { useSoundsStore } from 'src/stores/sounds-store';

const soundsStore = useSoundsStore();
const settingsStore = useSettingsStore();

watchEffect(() => {
  settingsStore.saveSettings();
});

watch(
  () => settingsStore.normalizationLuTarget,
  (newValue: number) => {
    settingsStore.normalizationLuTarget = newValue;
  }
);

watch(
  () => settingsStore.peakMeterOrangeThreshold,
  (newValue: number) => {
    settingsStore.peakMeterOrangeThreshold = newValue;
  }
);

watch(
  () => settingsStore.peakMeterRedThreshold,
  (newValue: number) => {
    settingsStore.peakMeterRedThreshold = newValue;
  }
);

function getPerformanceLabel() {
  if (settingsStore.audioContextLatencyHint === 'interactive') {
    return 'Minimize latency';
  } else if (settingsStore.audioContextLatencyHint === 'playback') {
    return 'Best performance';
  }
  return 'Best performance';
}
</script>

<style scoped>
.close-button {
  display: flex;
  justify-content: center;
  align-items: center;
}
.settings-panel {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  background-color: var(--bkgColor);
  border: 0px;
  padding: 4px;
}
.settings-part-name {
  font-size: 1rem;
  color: var(--blueColor);
  font-weight: 500;
  text-transform: uppercase;
}
.settings-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 2px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.715em;
  color: orange;
  max-width: 100%;
  text-transform: uppercase;
}
.settings-label {
  padding-right: 10px;
}
.listLabel {
  color: var(--blueColor);
  font-size: 1rem;
  font-family: 'Roboto', sans-serif;
  text-transform: uppercase;
  font-size: 14px;
  font-weight: 500;
}
.settings-slider {
  height: 100%;
  width: 40%;
}
</style>
