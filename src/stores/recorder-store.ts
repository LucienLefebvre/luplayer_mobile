import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { RecorderState } from 'src/components/models';
import { RecordedSound, SoundMarker } from 'src/components/models';

export const useRecorderStore = defineStore('recorderStore', {
  state: () =>
    reactive({
      state: RecorderState.INITIALIZING,
      currentSound: {
        id: uuidv4(),
        name: 'New recording',
        markers: [] as SoundMarker[],
      } as RecordedSound,
    }),

  actions: {},
});
