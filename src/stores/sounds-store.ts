import { reactive } from 'vue';
import { defineStore } from 'pinia';
import { useSettingsStore } from './settings-store';
import { v4 as uuidv4 } from 'uuid';
import {
  SoundModel,
  dummySound,
  StereoAnalyserObject,
  EnveloppePoint,
} from 'src/components/models';
import {
  registerEventListeners,
  setSelectedSound,
  normalizeSound,
  findSoundArray,
  setPlaylistActiveSound as setPlaylistActiveSound,
} from 'src/composables/sound-controller';
import { Notify, getCssVar, Loading } from 'quasar';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export const useSoundsStore = defineStore('soundsStore', {
  state: () =>
    reactive({
      settingsStore: useSettingsStore(),

      numberOfSoundsToLoad: -1,
      numberOfLoadSaveSounds: 0,

      playlistSounds: [] as SoundModel[],
      cartSounds0: [] as SoundModel[],
      cartSounds1: [] as SoundModel[],

      loadingSounds: [] as File[],

      playerMode: 'playlist' as 'playlist' | 'cart' | 'playlistAndCart',
      arrayToAddSound: 'playlist' as 'playlist' | 'cart',

      audioContext: null as AudioContext | null,
      outputGainNode: null as GainNode | null,
      outputLimiterNode: null as DynamicsCompressorNode | null,
      outputAnalyserNodes: null as StereoAnalyserObject | null,
      sampleRate: 0 as number,

      selectedSound: null as SoundModel | null,
      playlistActiveSound: null as SoundModel | null,
      toBeDeletedSound: null as SoundModel | null,

      stoppedByButtonClick: false,
      faderTouchedDuringPlayback: false as boolean,
      faderIsTouched: false as boolean,

      isFading: false as boolean,

      isReordering: false,
      reorderLocked: false,

      showEditWindow: false as boolean,
      showReorderWindow: false as boolean,
      showSettingsWindow: false as boolean,
      showDeleteSoundWindow: false as boolean,
      showPlaylistLoadSaveWindow: false as boolean,
      playlistLoadSaveWindowText: 'Saving playlist...' as string,
      playlistLoadSaveProgress: 0 as number,
      selectedSoundVolumeSliderValue: 0.0 as number,
      selectedSoundVolume: 0.0 as number,

      momentaryLoudness: { value: 0.0 as number },
    }),

  actions: {
    async initAudioContext() {
      this.audioContext = new AudioContext();
      this.sampleRate = this.audioContext.sampleRate;

      this.outputGainNode = this.audioContext.createGain();
      this.outputLimiterNode = this.audioContext.createDynamicsCompressor();
      this.outputAnalyserNodes = {
        splitter: this.audioContext.createChannelSplitter(2),
        analysers: [
          this.audioContext.createAnalyser(),
          this.audioContext.createAnalyser(),
        ],
      };

      const analyser = this.outputAnalyserNodes;
      this.outputGainNode.connect(this.outputLimiterNode);
      this.outputLimiterNode.connect(analyser.splitter);
      analyser.splitter.connect(analyser.analysers[0], 0);
      analyser.splitter.connect(analyser.analysers[1], 1);
      this.outputLimiterNode.connect(this.audioContext.destination);
    },

    loadSound(
      audioElement: HTMLAudioElement,
      name: string,
      fileContent: ArrayBuffer
    ): Promise<void> {
      return new Promise((resolve, reject) => {
        audioElement.onloadedmetadata = async () => {
          try {
            if (this.audioContext === null) {
              this.initAudioContext();
              if (this.audioContext === null) return;
            }

            const defaultEnveloppePoints = [
              { time: 0, gainDb: 0 },
              { time: audioElement.duration, gainDb: 0 },
            ] as EnveloppePoint[];

            let addedSound: SoundModel = {
              id: uuidv4(),
              fileContent: fileContent,
              name: name,
              audioElement: audioElement,
              path: audioElement.src,
              color: getCssVar('primary') ?? '#000000',
              duration: audioElement.duration,
              remainingTime: audioElement.duration,
              isPlaying: false,
              isSelected: false,
              isPlaylistActiveSound: false,
              isCuePlayed: false,
              isLooping: false,
              hasBeenCuePlayed: false,
              volumeDb: 0.0,
              trimDb: 0.0,
              source: null,
              trimGainNode: null,
              volumeGainNode: null,
              enveloppeGainNode: null,
              inTime: null,
              outTime: null,
              integratedLoudness: null,
              hpfEnabled: false,
              hpfFrequency: 80,
              launchTime: 0,
              waveformChunks: null,
              enveloppePoints: defaultEnveloppePoints,
              displayWaveform: true,
              enveloppeIsEnabled: false,
            };

            addedSound = reactive(addedSound);

            registerEventListeners(addedSound);

            if (this.playerMode === 'playlist') {
              this.addSoundToPlaylist(addedSound);
            } else if (this.playerMode === 'cart') {
              this.addSoundToCart(addedSound);
            } else if (this.playerMode === 'playlistAndCart') {
              if (this.arrayToAddSound === 'playlist') {
                this.addSoundToPlaylist(addedSound);
              } else {
                this.addSoundToCart(addedSound);
              }
            }

            if (this.settingsStore.autoNormalize) {
              normalizeSound(
                addedSound,
                Number(this.settingsStore.normalizationLuTarget)
              );
            }

            this.numberOfLoadSaveSounds++;
            resolve();
          } catch (error) {
            reject(error);
          }
        };
      });
    },

    addSoundToCart(addedSound: SoundModel) {
      const cartArrayToAdd =
        this.cartSounds0.length <= this.cartSounds1.length
          ? this.cartSounds0
          : this.cartSounds1;

      cartArrayToAdd.push(addedSound);
    },

    addSoundToPlaylist(addedSound: SoundModel) {
      const arrayToAdd = this.playlistSounds;
      arrayToAdd.push(addedSound);
      if (
        arrayToAdd.length === 1 &&
        (this.playerMode === 'playlist' ||
          this.playerMode === 'playlistAndCart')
      ) {
        setSelectedSound(arrayToAdd[0]);
        setPlaylistActiveSound(arrayToAdd[0]);
      }
    },

    askForSoundDeletion(sound: SoundModel) {
      this.toBeDeletedSound = sound;
      this.showDeleteSoundWindow = true;
    },

    deleteSound(sound: SoundModel) {
      const array = findSoundArray(sound);
      if (array === null) return;

      const index = array.indexOf(sound);
      if (index === -1) return;

      if (sound.audioElement.paused) {
        this.showEditWindow = false;
        array.splice(index, 1);
        if (sound.isSelected) {
          this.selectedSound = null;
          if (
            (this.playlistSounds.length > 0 &&
              this.playerMode === 'playlist') ||
            this.playerMode === 'playlistAndCart'
          ) {
            setSelectedSound(this.playlistSounds[0]);
          }
        }
        if (sound.isPlaylistActiveSound) {
          this.playlistActiveSound = null;
          if (
            (this.playlistSounds.length > 0 &&
              this.playerMode === 'playlist') ||
            this.playerMode === 'playlistAndCart'
          ) {
            setPlaylistActiveSound(this.playlistSounds[0]);
          }
        }
      } else {
        Notify.create({
          message: "Can't delete a sound while it's playing",
          type: 'negative',
          position: 'top',
          timeout: 2000,
        });
        return;
      }

      const deleteNotifyString = `Sound "${sound.name}" deleted`;
      Notify.create({
        message: deleteNotifyString,
        type: 'negative',
        timeout: 2000,
        position: 'top',
      });

      sound = dummySound;
      this.toBeDeletedSound = null;
    },

    checkIfThereAreLoadedSounds() {
      if (this.playerMode === 'playlist') {
        return this.playlistSounds.length > 0;
      }
      if (this.playerMode === 'cart') {
        return this.cartSounds0.length > 0 || this.cartSounds1.length > 0;
      }
    },

    initializePlaylistMode() {
      if (this.playerMode === 'playlist') return;

      if (this.playerMode === 'playlistAndCart') {
        this.playerMode = 'playlist';
        return;
      }
      this.playerMode = 'playlist';

      this.selectedSound = null;
      this.deselectAllSounds();

      this.playlistSounds = [];

      const cartSounds0Length = this.cartSounds0.length;
      const cartSounds1Length = this.cartSounds1.length;
      if (cartSounds0Length > 0 || cartSounds1Length > 0) {
        const maxLength = Math.max(cartSounds0Length, cartSounds1Length);
        for (let i = 0; i < maxLength; i++) {
          if (this.cartSounds0[i]) {
            this.playlistSounds.push(this.cartSounds0[i]);
          }
          if (this.cartSounds1[i]) {
            this.playlistSounds.push(this.cartSounds1[i]);
          }
        }
      }

      if (this.playlistSounds.length > 0) {
        setPlaylistActiveSound(this.playlistSounds[0], true);
      }

      this.cartSounds0 = [];
      this.cartSounds1 = [];
    },

    initializeCartMode() {
      if (this.playerMode === 'cart') return;

      this.playerMode = 'cart';
      this.selectedSound = null;
      this.deselectAllSounds();

      this.cartSounds0 = [];
      this.cartSounds1 = [];

      const playlistSoundsCopy = [...this.playlistSounds];

      if (playlistSoundsCopy.length > 0) {
        playlistSoundsCopy.forEach((sound, index) => {
          sound.isPlaylistActiveSound = false;
          this.playlistActiveSound = null;
          const arrayToPush =
            index % 2 === 0 ? this.cartSounds0 : this.cartSounds1;
          arrayToPush.push(sound);
        });
      }

      this.playlistSounds = [];
    },

    initializePlaylistAndCartMode() {
      if (this.playerMode === 'playlistAndCart') return;

      this.playerMode = 'playlistAndCart';

      this.deselectAllSounds();

      if (this.playlistSounds.length > 0) {
        setPlaylistActiveSound(this.playlistSounds[0], true);
      }
    },

    deselectAllSounds() {
      this.selectedSound = null;
      this.deselectAllSoundsInArray(this.playlistSounds);
      this.deselectAllSoundsInArray(this.cartSounds0);
      this.deselectAllSoundsInArray(this.cartSounds1);
    },

    deselectAllSoundsInArray(array: SoundModel[]) {
      array.forEach((sound) => {
        sound.isSelected = false;
      });
    },

    deleteAllSounds() {
      this.playlistSounds = [];
      this.cartSounds0 = [];
      this.cartSounds1 = [];
      this.selectedSound = null;
      this.playlistActiveSound = null;
    },

    async savePlaylist(name: string) {
      try {
        this.showSettingsWindow = false;
        this.showPlaylistLoadSaveWindow = true;
        this.playlistLoadSaveWindowText = 'Saving playlist...';
        this.playlistLoadSaveProgress = 0;
        this.numberOfLoadSaveSounds = 0;

        const soundList = [] as string[];

        for (const sound of this.playlistSounds) {
          soundList.push(sound.id);
          await this.saveSound(sound);
        }

        const data = JSON.stringify(soundList);
        const path = `${name}.luplaylist`;

        await Filesystem.writeFile({
          path: path,
          data: data,
          directory: Directory.External,
          encoding: Encoding.UTF8,
        });

        const savedPlaylists = JSON.parse(
          localStorage.getItem('savedPlaylists') || '[]'
        );
        savedPlaylists.unshift(name);
        localStorage.setItem('savedPlaylists', JSON.stringify(savedPlaylists));

        this.showPlaylistLoadSaveWindow = false;

        Notify.create({
          message: `Playlist "${name}" saved`,
          type: 'positive',
          position: 'top',
        });
      } catch (error) {
        Notify.create({
          message: 'Error while saving playlist',
          type: 'negative',
          position: 'top',
        });
        this.showSettingsWindow = false;
        this.showPlaylistLoadSaveWindow = false;
      }
    },

    async saveSound(sound: SoundModel) {
      const start = performance.now();

      sound.base64FileContent = this.arrayBufferToBase64(sound.fileContent);
      const data = JSON.stringify(sound);

      await Filesystem.writeFile({
        path: sound.id,
        data: data,
        directory: Directory.External,
        encoding: Encoding.UTF8,
      });

      this.numberOfLoadSaveSounds++;
      this.playlistLoadSaveProgress =
        this.numberOfLoadSaveSounds / this.playlistSounds.length;

      const end = performance.now();
      console.log('Save sound duration: ', end - start);
    },

    async loadPlaylist(playlist: string, keepCurrentSounds: boolean) {
      try {
        if (this.audioContext === null) {
          this.initAudioContext();
        }
        this.showSettingsWindow = false;
        this.showPlaylistLoadSaveWindow = true;
        this.playlistLoadSaveWindowText = 'Loading playlist...';
        this.playlistLoadSaveProgress = 0;
        this.numberOfLoadSaveSounds = 0;

        if (!keepCurrentSounds) {
          this.deleteAllSounds();
        }

        const playlistFile = await Filesystem.readFile({
          path: `${playlist}.luplaylist`,
          directory: Directory.External,
          encoding: Encoding.UTF8,
        });

        let soundList: string[] = [];
        if (typeof playlistFile.data === 'string') {
          soundList = JSON.parse(playlistFile.data);
        }
        const numberOfSoundsToLoad = soundList.length;

        await Promise.all(
          soundList.map(async (soundId) => {
            await this.loadSoundFromFile(soundId);
            this.numberOfLoadSaveSounds++;
            this.playlistLoadSaveProgress =
              this.numberOfLoadSaveSounds / numberOfSoundsToLoad;
          })
        ).then(() => {
          this.showSettingsWindow = false;
          this.showPlaylistLoadSaveWindow = false;

          if (
            this.playerMode === 'playlist' &&
            this.playlistSounds.length > 0
          ) {
            setPlaylistActiveSound(this.playlistSounds[0], true);
          }

          Notify.create({
            message: `Playlist "${playlist}" loaded`,
            type: 'positive',
            position: 'top',
          });
        });
      } catch (error) {
        console.log(error);
        Notify.create({
          message: 'Error while loading playlist',
          type: 'negative',
          position: 'top',
        });
        this.showSettingsWindow = false;
        this.showPlaylistLoadSaveWindow = false;
      }
    },

    async loadSoundFromFile(fileName: string) {
      const rawSound = await Filesystem.readFile({
        path: fileName,
        directory: Directory.External,
        encoding: Encoding.UTF8,
      });

      const loadedSound = JSON.parse(rawSound.data as string) as SoundModel;
      if (loadedSound.base64FileContent) {
        loadedSound.fileContent = this.base64ToArrayBuffer(
          loadedSound.base64FileContent
        );
      }

      const blob = new Blob([loadedSound.fileContent], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audioElement = document.createElement('audio');
      audioElement.src = url;
      audioElement.preload = 'metadata';

      audioElement.onloadedmetadata = () => {
        let sound: SoundModel = {
          ...loadedSound,
          audioElement: audioElement,
          path: audioElement.src,
          duration: audioElement.duration,
          remainingTime: audioElement.duration,
          isPlaying: false,
          isSelected: false,
          isPlaylistActiveSound: false,
          isCuePlayed: false,
          hasBeenCuePlayed: false,
          source: null,
          trimGainNode: null,
          volumeGainNode: null,
          enveloppeGainNode: null,
          launchTime: 0,
          displayWaveform: true,
        };

        sound = reactive(sound);
        registerEventListeners(sound);

        this.playlistSounds.push(sound);
      };
    },

    async deletePlaylist(playlist: string) {
      try {
        const playlistFile = await Filesystem.readFile({
          path: `${playlist}.luplaylist`,
          directory: Directory.External,
          encoding: Encoding.UTF8,
        });

        let soundList: string[] = [];
        if (typeof playlistFile.data === 'string') {
          soundList = JSON.parse(playlistFile.data);
        }
        const numberOfSoundsToLoad = soundList.length;

        await Promise.all(
          soundList.map(async (soundId) => {
            await Filesystem.deleteFile({
              path: soundId,
              directory: Directory.External,
            });
            this.numberOfLoadSaveSounds++;
            this.playlistLoadSaveProgress =
              this.numberOfLoadSaveSounds / numberOfSoundsToLoad;
          })
        );

        Filesystem.deleteFile({
          path: `${playlist}.luplaylist`,
          directory: Directory.External,
        });

        this.removePlaylistFromLocalStorage(playlist);

        Notify.create({
          message: `Playlist "${playlist}" deleted`,
          type: 'negative',
          position: 'top',
        });
      } catch (error) {
        this.removePlaylistFromLocalStorage(playlist);
      }
    },

    removePlaylistFromLocalStorage(playlist: string) {
      const savedPlaylists = JSON.parse(
        localStorage.getItem('savedPlaylists') || '[]'
      );
      const index = savedPlaylists.indexOf(playlist);
      savedPlaylists.splice(index, 1);
      localStorage.setItem('savedPlaylists', JSON.stringify(savedPlaylists));
    },

    arrayBufferToBase64(buffer: ArrayBuffer): string {
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    },

    base64ToArrayBuffer(base64: string): ArrayBuffer {
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    },
  },
});
