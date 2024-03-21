import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { RecordedSound } from 'src/components/models';

export const useSoundLibraryStore = defineStore('soundlibrarystore', {
  state: () =>
    reactive({
      recordedSounds: [] as RecordedSound[],
    }),

  getters: {},

  actions: {
    getRecordedSounds(): RecordedSound[] {
      this.recordedSounds = JSON.parse(
        localStorage.getItem('recordedSounds') || '[]'
      ) as RecordedSound[];
      return this.recordedSounds;
    },

    async addRecordedSoundToLibrary(sound: RecordedSound) {
      const recordedSounds = await this.getRecordedSounds();

      recordedSounds.unshift(sound);

      localStorage.setItem('recordedSounds', JSON.stringify(recordedSounds));
    },

    async deleteRecordedSoundFromLibrary(sound: RecordedSound) {
      const recordedSounds = await this.getRecordedSounds();

      const index = recordedSounds.findIndex((s) => s.id === sound.id);
      if (index > -1) {
        recordedSounds.splice(index, 1);
      }

      localStorage.setItem('recordedSounds', JSON.stringify(recordedSounds));
    },
  },
});
