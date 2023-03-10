import { defineStore } from 'pinia';

export const useSettingsStore = defineStore('settingsStore', {
  state: () => ({
    showMultiChannelWaveform: false as boolean, //TODO dynamic change
    autoNormalize: true as boolean,
    peakMeterOrangeThreshold: -9.0 as number,
    peakMeterRedThreshold: -3.0 as number,
  }),
});
