import { defineStore } from 'pinia';
import { reactive } from 'vue';

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
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

      isSaving: false,
      recordingSaved: false,
      selectedSoundChanged: false,

      db: null as IDBPDatabase | null,

      settingsStore: useSettingsStore(),

      gainNode: null as GainNode | null,
      stereoAnalyser: null as null | {
        splitter: ChannelSplitterNode;
        analysers: AnalyserNode[];
      },
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

      let sounds = await this.db?.getAll('sounds');
      if (!sounds) return [];
      sounds.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      const soundsOnDisk = await Filesystem.readdir({
        path: await this.getSoundsPath(true),
        directory: await this.getSoundsDirectory(),
      });

      sounds.forEach((sound) => {
        soundsOnDisk.files.forEach((file) => {
          if (file.name === sound.path) {
            sound.fileSizeInBytes = file.size;
          }
        });
        if (soundsOnDisk.files.some((file) => file.name === sound.path)) return;
        this.db?.delete('sounds', sound.id);
        sounds = sounds?.filter((recordedSound) => recordedSound !== sound);
      });

      this.recordedSounds = sounds.reverse();
      return this.recordedSounds;
      /*       this.db?.getAll('sounds').then(async (sounds: RecordedSound[]) => {
        sounds.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        await Filesystem.readdir({
          path: await this.getSoundsPath(),
          directory: await this.getSoundsDirectory(),
        }).then(async (files) => {
          sounds.forEach((sound) => {
            if (files.files.some((file) => file.name === sound.path)) return;
            this.db?.delete('sounds', sound.id);
            this.recordedSounds = this.recordedSounds.filter(
              (recordedSound) => recordedSound !== sound
            );
          });
        });
        this.recordedSounds = sounds.reverse();
        return this.recordedSounds;
      }); */
    },

    async setSelectedSound(sound: RecordedSound) {
      this.stopSelectedSound();
      this.selectedSound = sound;

      const audioElement = await this.getAudioElement(sound);

      if (!audioElement) return false;

      if (sound.peakDataAsStandardArray) {
        const peakData = sound.peakDataAsStandardArray?.map(
          (peakData) => new Uint8Array(peakData)
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

    async getSoundsPath(createDir = false): Promise<string> {
      if (Capacitor.getPlatform() === 'web') {
        return '';
      } else {
        if (createDir) {
          try {
            await Filesystem.readdir({
              path: 'Luplayer/RecordedSounds',
              directory: Directory.Documents,
            });
            const end = performance.now();
          } catch (error) {
            await Filesystem.mkdir({
              path: 'Luplayer/RecordedSounds',
              directory: Directory.Documents,
              recursive: true,
            });
          }
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
        newName + '.' + this.settingsStore.fileFormat
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

    async createFile(sound: RecordedSound): Promise<string> {
      try {
        const filePath = sound.name + '.' + this.settingsStore.fileFormat;
        const newFilePath = await this.getUniqueFileName(filePath);
        if (newFilePath && filePath !== newFilePath) {
          sound.name = newFilePath.split('.')[0];
        }
        if (!newFilePath) {
          console.error('Failed to get unique filename.');
          return '';
        }

        await Filesystem.writeFile({
          path: (await this.getSoundsPath(true)) + newFilePath,
          data: '',
          directory: this.getSoundsDirectory(),
          recursive: true,
        });

        return newFilePath;
      } catch (error) {
        console.error('createFile', error);
        return '';
      }
    },

    createDateString(): string {
      const now = new Date();
      const formattedString = [
        String(now.getMonth() + 1).padStart(2, '0'),

        String(now.getDate()).padStart(2, '0'),
        '_',
        String(now.getHours()).padStart(2, '0'),
        'h',
        String(now.getMinutes()).padStart(2, '0'),
        'm',
        String(now.getSeconds()).padStart(2, '0'),
        's',
      ].join('');
      return formattedString;
    },

    async appendDataToBase64String(sound: RecordedSound, data: Blob) {
      const buffer = await data.arrayBuffer();
      const base64 = this.array_buffer_to_base64(buffer);
      sound.audioDataAsBase64 += base64;
    },

    async writeBlobToFile(sound: RecordedSound, blob: Blob) {
      console.log(sound.audioDataAsBase64);
      try {
        const writeStart = performance.now();
        const path = (await this.getSoundsPath()) + sound.path;
        console.log('path', path);
        await write_blob({
          path: path,
          blob: blob,
          directory: this.getSoundsDirectory(),
        });
        const writeEnd = performance.now();
        console.log('write', writeEnd - writeStart);
      } catch (error) {
        console.error('writeDataToFile', error);
      }
    },

    async appendDataToFile(sound: RecordedSound, data: Blob) {
      try {
        const bufferStart = performance.now();
        const buffer = await data.arrayBuffer();
        const base64 = this.array_buffer_to_base64(buffer);
        const bufferEnd = performance.now();
        //console.log('buffer', bufferEnd - bufferStart);

        const writeStart = performance.now();
        Filesystem.appendFile({
          path: (await this.getSoundsPath()) + sound.path,
          data: base64,
          directory: this.getSoundsDirectory(),
        }).then(() => {
          const writeEnd = performance.now();
          //console.log('write', writeEnd - writeStart);
        });
      } catch (error) {
        console.error('appendDataToFile', error);
      }
    },

    array_buffer_to_base64(buffer: ArrayBuffer) {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    },

    async getUniqueFileName(
      fileName: string,
      attempt = 0
    ): Promise<string | null> {
      try {
        const path = await this.getSoundsPath();
        const directory = this.getSoundsDirectory();

        const files = await Filesystem.readdir({
          path: path,
          directory: directory,
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
        audioDataAsBase64: '',
        peakData: [],
        peakDataAsStandardArray: peakDataAsStandardArray,
        isPlaying: false,
        markers: serializedMarkers,
        audioElement: undefined,
        mediaElementSourceNode: undefined,
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
      if (this.selectedSound?.audioElement) {
        this.selectedSound?.audioElement?.play();
      }
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

    /*  createSoundNode(sound: RecordedSound) {
      console.log('createSoundNode', sound);
      if (!sound?.audioElement) return;
      if (!this.audioContext) this.createOutputAudioNodes();
      if (sound.mediaElementSourceNode === undefined) {
        const source = this.audioContext?.createMediaElementSource(
          sound.audioElement
        );

        sound.mediaElementSourceNode = source;
        source?.connect(this.gainNode!);
      }
    },

    createOutputAudioNodes() {
      this.audioContext = new AudioContext();
      console.log('audioContext', this.audioContext);
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.setValueAtTime(
        0.0,
        this.audioContext?.currentTime ?? 0
      );

      this.stereoAnalyser = {
        splitter: this.audioContext.createChannelSplitter(2),
        analysers: [
          this.audioContext.createAnalyser(),
          this.audioContext.createAnalyser(),
        ],
      };

      this.gainNode.connect(this.stereoAnalyser.splitter);
      this.stereoAnalyser.splitter.connect(this.stereoAnalyser.analysers[0], 0);
      this.stereoAnalyser.splitter.connect(this.stereoAnalyser.analysers[1], 0);
    }, */
  },
});
