import { defineStore } from 'pinia';
import { reactive } from 'vue';
export const useSettingsStore = defineStore('settingsStore', {
  state: () =>
    reactive({
      keepScreenAwake: true as boolean,
      vibration: true as boolean,

      autoScroll: true as boolean,

      showMultiChannelWaveform: false as boolean,

      showPeakMeter: true as boolean,

      peakMeterOrangeThreshold: 18.0 as number,
      peakMeterRedThreshold: 3.0 as number,

      showLuMeter: false as boolean,
      normalizationLuTarget: 0.0 as number,
      autoNormalize: true as boolean,

      faderSkewFactor: 2.0 as number,
      faderIsOtherSide: false as boolean,
      faderStop: true as boolean,

      falseStartTime: 1000 as number,
      doubleTapToStop: false as boolean,

      displayPlaylistControls: true as boolean,

      waveformVerticalZoomFactor: 1.3 as number,

      playlistWaveformHeightFactor: 1 as number,
      playlistSoundNameHeightFactor: 1 as number,
      cartIsDifferentHeightThanPlaylist: true as boolean,
      cartWaveformHeightFactor: 1 as number,
      cartSoundNameHeightFactor: 1 as number,

      defaultFadeInTime: 5000 as number,
      defaultFadeOutTime: 5000 as number,

      playlistAndCartCartSize: 150 as number,

      selectLastPlayedCartSound: true as boolean,
    }),

  actions: {
    saveSettings() {
      localStorage.setItem('settings', JSON.stringify(this.$state));
    },

    loadSettings() {
      const settings = JSON.parse(localStorage.getItem('settings') || '{}');
      Object.assign(this.$state, settings);
    },

    getPeakMeterOrangeThreshold() {
      return Number(this.peakMeterOrangeThreshold);
    },
  },
});
