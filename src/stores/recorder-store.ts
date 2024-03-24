import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { Recorder } from 'src/scripts/recorder';
import { Waveform } from 'src/scripts/waveform';

export const useRecorderStore = defineStore('recorderStore', {
  state: () =>
    reactive({
      r: null as Recorder | null,
      waveform: null as Waveform | null,
    }),

  getters: {},

  actions: {},
});
