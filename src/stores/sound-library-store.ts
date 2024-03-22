import { defineStore } from 'pinia';
import { reactive } from 'vue';

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import write_blob from 'capacitor-blob-writer';
import { openDB, IDBPDatabase } from 'idb';

import { RecordedSound } from 'src/components/models';

export const useSoundLibraryStore = defineStore('soundlibrarystore', {
  state: () =>
    reactive({
      recordedSounds: [] as RecordedSound[],
      audioContext: null as AudioContext | null,

      selectedSound: null as RecordedSound | null,

      recordingSaved: false,
      selectedSoundChanged: false,

      db: null as IDBPDatabase | null,
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
        this.recordedSounds = sounds;
      });

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

      const dbSound = await this.db?.get('sounds', sound.id);
      if (!dbSound) return;
      dbSound.name = newName;
      dbSound.path = newPath;
      await this.db?.put('sounds', dbSound);
      //this.updateRecordedSound(sound);
    },

    async updateSelectedSoundName(newName: string): Promise<void> {
      if (!this.selectedSound) return;

      const oldName = this.selectedSound.name;
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

      const soundToStore: RecordedSound = {
        ...sound,
        //peakData: [],
        //peakDataAsStandardArray: peakDataAsStandardArray,
        isPlaying: false,
      };

      const a = this.createObjectToStore(sound);

      recordedSounds.unshift(soundToStore);

      localStorage.setItem('recordedSounds', JSON.stringify(recordedSounds));

      if (!this.db) await this.openDB();
      await this.db?.add('sounds', a);
      console.log(this.db);
    },

    createObjectToStore(sound: RecordedSound) {
      const peakDataAsStandardArray = sound.peakData.map((peakData) =>
        Array.from(peakData)
      );

      const serializedMarkers = sound.markers.map((marker) => ({
        id: marker.id,
        name: marker.name,
        positionInMs: marker.positionInMs,
        color: marker.color,
        nameHasBeenEdited: marker.nameHasBeenEdited,
        showDialog: marker.showDialog,
      }));

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

    async deleteRecordedSoundFromLibrary(sound: RecordedSound) {
      if (!this.db) await this.openDB();

      await this.db?.delete('sounds', sound.id);
      await this.deleteSoundFile(sound);

      if (sound === this.selectedSound) {
        this.selectedSound = null;
        this.selectedSoundChanged = true;
      }
    },

    async deleteSoundFile(sound: RecordedSound) {
      if (sound.path) {
        await Filesystem.deleteFile({
          path: sound.path,
          directory: Directory.External,
        });
      }
    },

    async updateRecordedSound(sound: RecordedSound) {
      if (!this.db) await this.openDB();

      //await this.db?.put('sounds', this.createObjectToStore(sound));

      const index = this.recordedSounds.findIndex((s) => s.id === sound.id);
      if (index > -1) {
        this.recordedSounds[index] = { ...sound, isPlaying: false };
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
        } catch (error) {
          console.error('getAudioElement', error);
        }
      } else if (Capacitor.getPlatform() === 'android' && sound.path) {
        try {
          Filesystem.getUri({
            path: sound.path,
            directory: Directory.External,
          }).then(function ({ uri }) {
            audioElement.src = Capacitor.convertFileSrc(uri);
          });

          this.registerAudioElementCallbacks(sound);
        } catch (error) {
          console.error('getAudioElement', error);
        }
      }

      audioElement.addEventListener('play', () => {
        sound.isPlaying = true;
      });
      audioElement.addEventListener('ended', () => {
        sound.isPlaying = false;
      });
      audioElement.addEventListener('pause', () => {
        sound.isPlaying = false;
      });

      return audioElement;
    },

    registerAudioElementCallbacks(sound: RecordedSound) {
      if (!sound.audioElement) return;
      console.log('registerAudioElementCallbacks', sound.name);
      sound.audioElement.addEventListener('play', () => {
        sound.isPlaying = true;
      });
      sound.audioElement.addEventListener('ended', () => {
        sound.isPlaying = false;
      });
      sound.audioElement.addEventListener('pause', () => {
        sound.isPlaying = false;
      });
    },

    async setSelectedSound(sound: RecordedSound) {
      this.stopSelectedSound();
      this.selectedSound = sound;

      const audioElement = await this.getAudioElement(sound);

      if (!audioElement) return false;

      const peakData = sound.peakDataAsStandardArray?.map(
        (peakData) => new Float32Array(peakData)
      );

      sound.peakData = peakData || [];

      this.selectedSound.audioElement = audioElement;
      this.selectedSoundChanged = true;
      return true;
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
  },
});
