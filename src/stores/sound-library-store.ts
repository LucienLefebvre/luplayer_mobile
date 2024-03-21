import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { RecordedSound } from 'src/components/models';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import write_blob from 'capacitor-blob-writer';
import { Capacitor } from '@capacitor/core';

export const useSoundLibraryStore = defineStore('soundlibrarystore', {
  state: () =>
    reactive({
      recordedSounds: [] as RecordedSound[],
      audioContext: null as AudioContext | null,

      selectedSound: null as RecordedSound | null,

      recordingSaved: false,
      selectedSoundChanged: false,
    }),

  getters: {},

  actions: {
    getRecordedSounds(): RecordedSound[] {
      this.recordedSounds = JSON.parse(
        localStorage.getItem('recordedSounds') || '[]'
      ) as RecordedSound[];
      return this.recordedSounds;
    },

    async updateSoundName(
      sound: RecordedSound,
      oldName: string,
      newName: string
    ): Promise<void> {
      const oldPath = oldName + '.ogg';
      const newPath = newName + '.ogg';

      console.log('oldPath', oldPath);
      console.log('newPath', newPath);

      await Filesystem.rename({
        from: oldPath,
        to: newPath,
        directory: Directory.External,
      });

      sound.name = newName;
      sound.path = newPath;

      this.updateRecordedSound(sound);
    },

    async updateSelectedSoundName(
      newName: string,
      oldName: string
    ): Promise<void> {
      if (!this.selectedSound) return;

      await this.updateSoundName(this.selectedSound, oldName, newName);
    },

    async saveRecording(sound: RecordedSound, chunks: Blob[]) {
      try {
        const fileName = sound.name + '.ogg';
        const newFileName = await this.getUniqueFileName(fileName);
        if (newFileName && fileName !== newFileName) {
          sound.name = newFileName.split('.')[0];
        }
        if (!newFileName) {
          console.error('Failed to get unique filename.');
          return;
        }
        await write_blob({
          directory: Directory.External,
          path: newFileName,
          blob: chunks[0],
          fast_mode: true,
        });
        sound.path = newFileName;
        await this.addRecordedSoundToLibrary(sound);

        this.recordingSaved = true;
      } catch (error) {
        console.error('saveRecording', error);
      }
    },

    async getUniqueFileName(
      fileName: string,
      attempt = 0
    ): Promise<string | null> {
      try {
        const files = await Filesystem.readdir({
          path: '',
          directory: Directory.External,
        });
        const existingFileNames = files.files.map((file) => file.name);
        let newFileName = fileName;
        while (existingFileNames.includes(newFileName)) {
          const [name, extension] = fileName.split('.');
          newFileName = `${name}_${attempt}.${extension}`;
          attempt++;
        }
        return newFileName;
      } catch (error) {
        console.error('getUniqueFileName', error);
        return null;
      }
    },

    async addRecordedSoundToLibrary(sound: RecordedSound) {
      const recordedSounds = await this.getRecordedSounds();

      const peakDataAsStandardArray = sound.peakData.map((peakData) =>
        Array.from(peakData)
      );

      const soundToStore = {
        ...sound,
        peakData: [],
        peakDataAsStandardArray: peakDataAsStandardArray,
      };

      recordedSounds.unshift(soundToStore);

      localStorage.setItem('recordedSounds', JSON.stringify(recordedSounds));
    },

    async deleteRecordedSoundFromLibrary(sound: RecordedSound) {
      const index = this.recordedSounds.findIndex((s) => s.id === sound.id);
      if (index > -1) {
        this.recordedSounds.splice(index, 1);
      }

      localStorage.setItem(
        'recordedSounds',
        JSON.stringify(this.recordedSounds)
      );

      if (sound === this.selectedSound) {
        this.selectedSound = null;
        this.selectedSoundChanged = true;
      }
    },

    async updateRecordedSound(sound: RecordedSound) {
      const index = this.recordedSounds.findIndex((s) => s.id === sound.id);
      if (index > -1) {
        this.recordedSounds[index] = sound;
      }

      localStorage.setItem(
        'recordedSounds',
        JSON.stringify(this.recordedSounds)
      );
    },

    async getAudioElement(
      sound: RecordedSound
    ): Promise<HTMLAudioElement | null> {
      let audioElement = new Audio();
      if (Capacitor.getPlatform() === 'web' && sound.path) {
        try {
          const { data } = (await Filesystem.readFile({
            path: sound.path,
            directory: Directory.External,
          })) as { data: Blob };

          const url = URL.createObjectURL(data);

          audioElement = document.createElement('audio');
          audioElement.src = url;

          audioElement.onended = () => {
            sound.isPlaying = false;
          };
          audioElement.onpause = () => {
            sound.isPlaying = false;
          };
          audioElement.onplay = () => {
            sound.isPlaying = true;
          };
          return audioElement;
        } catch (error) {
          console.error('playRecordedSound', error);
        }
      } else if (Capacitor.getPlatform() === 'android' && sound.path) {
        try {
          Filesystem.getUri({
            path: sound.path,
            directory: Directory.External,
          }).then(function ({ uri }) {
            audioElement.src = Capacitor.convertFileSrc(uri);
          });
        } catch (error) {
          console.error('playRecordedSound', error);
        }
      }

      audioElement.onended = () => {
        sound.isPlaying = false;
      };
      audioElement.onpause = () => {
        sound.isPlaying = false;
      };
      audioElement.onplay = () => {
        sound.isPlaying = true;
      };
      return audioElement;
    },

    async setSelectedSound(sound: RecordedSound) {
      this.selectedSound = sound;
      const audioElement = await this.getAudioElement(sound);

      const peakData = sound.peakDataAsStandardArray?.map(
        (peakData) => new Float32Array(peakData)
      );

      sound.peakData = peakData || [];

      if (!audioElement) return false;
      this.selectedSound.audioElement = audioElement;
      this.selectedSoundChanged = true;
      return true;
    },

    playSelectedSound() {
      if (!this.selectedSound || !this.selectedSound.audioElement) return;
      this.selectedSound.audioElement?.play();
      this.selectedSound.isPlaying = true;
    },

    pauseSelectedSound() {
      if (!this.selectedSound || !this.selectedSound.audioElement) return;
      this.selectedSound.audioElement.pause();
      this.selectedSound.isPlaying = false;
    },

    stopSelectedSound() {
      if (!this.selectedSound || !this.selectedSound.audioElement) return;
      this.selectedSound.audioElement.pause();
      this.selectedSound.audioElement.currentTime = 0;
      this.selectedSound.isPlaying = false;
    },
  },
});
