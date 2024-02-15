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
import { Notify, getCssVar } from 'quasar';
import SoundDetails from 'src/components/SoundDetails.vue';

export const useSoundsStore = defineStore('soundsStore', {
  state: () =>
    reactive({
      settingsStore: useSettingsStore(),

      numberOfSoundsToLoad: -1,
      numberOfLoadedSounds: 0,

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

    loadSound(audioElement: HTMLAudioElement, name: string): Promise<void> {
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
              name: name,
              audioElement: audioElement,
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

            this.numberOfLoadedSounds++;
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
      /* if (
        (this.selectedSound === null && this.playerMode === 'playlist') ||
        'playlistAndCart'
      ) {
        setSelectedSound(addedSound);
      } */
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
          timeout: 2000,
        });
        return;
      }

      const deleteNotifyString = `Sound "${sound.name}" deleted`;
      Notify.create({
        message: deleteNotifyString,
        type: 'negative',
        timeout: 2000,
      });

      sound = dummySound;
      this.toBeDeletedSound = null;
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
  },
});
