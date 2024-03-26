import { defineStore } from 'pinia';
import { reactive } from 'vue';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import write_blob from 'capacitor-blob-writer';
import { openDB, IDBPDatabase } from 'idb';

import { RecordedSound, SoundMarker } from 'src/components/models';
import { useSettingsStore } from 'src/stores/settings-store';

export const useSoundLibraryStore = defineStore('soundlibrarystore', {
  state: () =>
    reactive({
      recordedSounds: [] as RecordedSound[],
      audioContext: null as AudioContext | null,

      selectedSound: null as RecordedSound | null,

      recordingSaved: false,
      selectedSoundChanged: false,

      db: null as IDBPDatabase | null,

      settingsStore: useSettingsStore(),
    }),

  getters: {},

  actions: {
    async openDB() {
      await openDB('recorded-sound-library', 1, {
        upgrade(db) {
          db.createObjectStore('sounds', {
            keyPath: 'id',
            autoIncrement: true,
          });
        },
      }).then((db) => {
        this.db = db;
      });
    },

    async getRecordedSounds(): Promise<RecordedSound[]> {
      if (!this.db) await this.openDB();

      this.db?.getAll('sounds').then((sounds: RecordedSound[]) => {
        sounds.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        this.recordedSounds = sounds.reverse();
      });

      return this.recordedSounds;
    },

    async setSelectedSound(sound: RecordedSound) {
      this.stopSelectedSound();
      this.selectedSound = sound;

      const audioElement = await this.getAudioElement(sound);

      if (!audioElement) return false;

      if (sound.peakDataAsStandardArray) {
        const peakData = sound.peakDataAsStandardArray?.map(
          (peakData) => new Float32Array(peakData)
        );
        sound.peakData = peakData || [];
        sound.peakDataAsStandardArray = undefined;
      }

      this.selectedSound.audioElement = audioElement;
      this.selectedSoundChanged = true;
      return true;
    },

    getSoundsDirectory(): Directory {
      if (Capacitor.getPlatform() === 'web') {
        return Directory.External;
      } else {
        return Directory.Documents;
      }
    },

    async getSoundsPath(): Promise<string> {
      if (Capacitor.getPlatform() === 'web') {
        return '';
      } else {
        try {
          await Filesystem.readdir({
            path: 'Luplayer/RecordedSounds',
            directory: Directory.Documents,
          });
        } catch (error) {
          await Filesystem.mkdir({
            path: 'Luplayer/RecordedSounds',
            directory: Directory.Documents,
            recursive: true,
          });
        }
        return 'Luplayer/RecordedSounds/';
      }
    },

    async getAudioElement(
      sound: RecordedSound
    ): Promise<HTMLAudioElement | null> {
      const audioElement = document.createElement('audio');
      if (Capacitor.getPlatform() === 'web' && sound.path) {
        try {
          const { data } = (await Filesystem.readFile({
            path: (await this.getSoundsPath()) + sound.path,
            directory: this.getSoundsDirectory(),
          })) as { data: Blob };

          const url = URL.createObjectURL(data);

          audioElement.src = url;
        } catch (error) {
          console.error('getAudioElement', error);
        }
      } else if (Capacitor.getPlatform() === 'android' && sound.path) {
        try {
          await Filesystem.getUri({
            path: (await this.getSoundsPath()) + sound.path,
            directory: this.getSoundsDirectory(),
          }).then(function ({ uri }) {
            audioElement.src = Capacitor.convertFileSrc(uri);
          });

          this.registerAudioElementCallbacks(sound);
        } catch (error) {
          console.error('getAudioElement', error);
        }
      } else {
        throw new Error('Platform not supported');
      }

      audioElement.addEventListener('play', () => {
        this.setSoundIsPlaying(sound, true);
      });
      audioElement.addEventListener('ended', () => {
        this.setSoundIsPlaying(sound, false);
      });
      audioElement.addEventListener('pause', () => {
        this.setSoundIsPlaying(sound, false);
      });

      return audioElement;
    },

    registerAudioElementCallbacks(sound: RecordedSound) {
      if (!sound.audioElement) return;
      sound.audioElement.addEventListener('play', () => {
        this.setSoundIsPlaying(sound, true);
      });
      sound.audioElement.addEventListener('ended', () => {
        this.setSoundIsPlaying(sound, false);
      });
      sound.audioElement.addEventListener('pause', () => {
        this.setSoundIsPlaying(sound, false);
      });
    },

    deregisterAudioElementCallbacks(sound: RecordedSound) {
      if (!sound.audioElement) return;
      sound.audioElement.removeEventListener('play', () => {
        this.setSoundIsPlaying(sound, true);
      });
      sound.audioElement.removeEventListener('ended', () => {
        this.setSoundIsPlaying(sound, false);
      });
      sound.audioElement.removeEventListener('pause', () => {
        this.setSoundIsPlaying(sound, false);
      });
    },

    setSoundIsPlaying(sound: RecordedSound, isPlaying: boolean) {
      sound.isPlaying = isPlaying;
    },

    async updateSoundName(
      sound: RecordedSound,
      newName: string
    ): Promise<void> {
      const oldPath = sound.path ?? '';
      const newPath = await this.getUniqueFileName(
        newName + '.' + this.settingsStore.recorder.fileFormat
      );
      if (!newPath) {
        console.error('Failed to get unique filename.');
        return;
      }

      await Filesystem.rename({
        from: (await this.getSoundsPath()) + oldPath,
        to: (await this.getSoundsPath()) + newPath,
        directory: this.getSoundsDirectory(),
      });

      sound.name = newName;
      sound.path = newPath;

      const dbSound = await this.db?.get('sounds', sound.id);
      if (!dbSound) return;
      dbSound.name = newName;
      dbSound.path = newPath;
      await this.db?.put('sounds', dbSound);
    },

    async updateSelectedSoundName(newName: string): Promise<void> {
      if (!this.selectedSound) return;

      await this.updateSoundName(this.selectedSound, newName);
    },

    async saveRecording(sound: RecordedSound, chunks: Blob[]) {
      try {
        const filePath =
          sound.name + '.' + this.settingsStore.recorder.fileFormat;
        const newFilePath = await this.getUniqueFileName(filePath);
        if (newFilePath && filePath !== newFilePath) {
          sound.name = newFilePath.split('.')[0];
        }
        if (!newFilePath) {
          console.error('Failed to get unique filename.');
          return;
        }

        await write_blob({
          path: (await this.getSoundsPath()) + newFilePath,
          directory: this.getSoundsDirectory(),
          blob: chunks[0],
          fast_mode: true,
        });
        sound.fileSizeInBytes = chunks[0].size;
        sound.path = newFilePath;
        await this.addRecordedSoundToLibrary(sound);

        this.setSelectedSound(sound);
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
          path: await this.getSoundsPath(),
          directory: this.getSoundsDirectory(),
        });
        console.log('files', files);
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
      const soundToStore = this.createObjectToStore(sound);

      if (!this.db) await this.openDB();
      await this.db?.add('sounds', soundToStore);

      this.recordedSounds.unshift(sound);
    },

    createObjectToStore(sound: RecordedSound) {
      const peakDataAsStandardArray = sound.peakData.map((peakData) =>
        Array.from(peakData)
      );

      const serializedMarkers = this.serializeMarkers(sound.markers);

      const objectToStore = {
        ...sound,
        peakData: [],
        peakDataAsStandardArray: peakDataAsStandardArray,
        isPlaying: false,
        markers: serializedMarkers,
        audioElement: undefined,
      };

      return objectToStore;
    },

    serializeMarkers(markers: SoundMarker[]) {
      return markers.map((marker) => ({
        id: marker.id,
        name: marker.name,
        positionInMs: marker.positionInMs,
        color: marker.color,
        nameHasBeenEdited: marker.nameHasBeenEdited,
        showDialog: marker.showDialog,
      }));
    },

    async deleteRecordedSoundFromLibrary(sound: RecordedSound) {
      if (sound.isPlaying) this.stopSound(sound);
      this.deregisterAudioElementCallbacks(sound);
      if (!this.db) await this.openDB();

      await this.db?.delete('sounds', sound.id);
      await this.deleteSoundFile(sound);

      if (sound === this.selectedSound) {
        this.selectedSound = null;
        this.selectedSoundChanged = true;
      }

      await this.getRecordedSounds();
    },

    async deleteSoundFile(sound: RecordedSound) {
      if (sound.path) {
        await Filesystem.deleteFile({
          path: (await this.getSoundsPath()) + sound.path,
          directory: this.getSoundsDirectory(),
        });
      }
    },

    async updateSoundMarkers(sound: RecordedSound) {
      if (!this.db) await this.openDB();

      const dbSound = await this.db?.get('sounds', sound.id);
      if (!dbSound) return;

      dbSound.markers = this.serializeMarkers(sound.markers);
      await this.db?.put('sounds', dbSound);
    },

    playSelectedSound() {
      if (this.selectedSound?.audioElement)
        this.selectedSound.audioElement?.play();
    },

    pauseSelectedSound() {
      if (this.selectedSound?.audioElement)
        this.selectedSound.audioElement.pause();
    },

    stopSelectedSound() {
      if (this.selectedSound?.audioElement) {
        this.selectedSound.audioElement.pause();
        this.selectedSound.audioElement.currentTime = 0;
      }
    },

    stopSound(sound: RecordedSound) {
      if (sound.audioElement) {
        sound.audioElement.pause();
        sound.audioElement.currentTime = 0;
      }
    },

    getFileFormat(sound: RecordedSound): string {
      return sound.path?.split('.').pop() ?? '';
    },

    getFileSizeInMBAsString(sound: RecordedSound): string {
      if (!sound.fileSizeInBytes) return '0';
      const sizeString =
        (sound.fileSizeInBytes / 1024 / 1024).toFixed(2) + 'MB';
      return sizeString;
    },
  },
});
