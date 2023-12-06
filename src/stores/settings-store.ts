import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settingsStore', {
  state: () => ({
    keepScreenAwake: true as boolean,

    autoScroll: true as boolean,

    showMultiChannelWaveform: false as boolean, //TODO dynamic change

    showPeakMeter: true as boolean,

    peakMeterOrangeThreshold: 18.0 as number,
    peakMeterRedThreshold: 3.0 as number,

    showLuMeter: true as boolean,
    normalizationLuTarget: 0.0 as number,
    autoNormalize: true as boolean,

    faderSkewFactor: 2.0 as number,
    faderIsOtherSide: false as boolean,
    faderStop: true as boolean,

    falseStartTime: 1000 as number,

    waveformVerticalZoomFactor: 1.7 as number,

    waveformHeightFactor: 1 as number,
    soundNameHeightFactor: 1 as number,
  }),

  actions: {
    saveSettings() {
      localStorage.setItem('settings', JSON.stringify(this.$state));
    },

    loadSettings() {
      const settings = JSON.parse(localStorage.getItem('settings') || '{}');
      Object.assign(this.$state, settings);
    },
  },
});
