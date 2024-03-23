import { defineStore } from 'pinia';
import { reactive } from 'vue';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import write_blob from 'capacitor-blob-writer';
import { openDB, IDBPDatabase } from 'idb';

import { RecordedSound, SoundMarker } from 'src/components/models';

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

      console.log(sound.peakData);
      console.log(sound.peakDataAsStandardArray);
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

    async updateSoundName(
      sound: RecordedSound,
      oldName: string,
      newName: string
    ): Promise<void> {
      const oldPath = oldName + '.ogg';
      const newPath = newName + '.ogg';

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
        const filePath = sound.name + '.ogg';
        const newFilePath = await this.getUniqueFileName(filePath);
        if (newFilePath && filePath !== newFilePath) {
          sound.name = newFilePath.split('.')[0];
        }
        if (!newFilePath) {
          console.error('Failed to get unique filename.');
          return;
        }
        await write_blob({
          directory: Directory.External,
          path: newFilePath,
          blob: chunks[0],
          fast_mode: true,
        });
        sound.path = newFilePath;
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
          path: sound.path,
          directory: Directory.External,
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
  },
});
