import { reactive } from 'vue';
import { defineStore } from 'pinia';
import { useSettingsStore } from './settings-store';
import { v4 as uuidv4 } from 'uuid';
import {
  SoundModel,
  StereoAnalyserObject,
  EnveloppePoint,
} from 'src/components/models';
import {
  registerEventListeners,
  setSelectedSound,
  normalizeSound,
} from 'src/composables/sound-controller';
import {
  calculateIntegratedLoudness,
  calculateMomentaryLoudness,
} from 'src/composables/loudness-calculation';
import { normalize } from 'path';

export const useSoundsStore = defineStore('soundsStore', {
  state: () => ({
    settingsStore: useSettingsStore(),
    sounds: [[], []] as [SoundModel[], SoundModel[]],
    playerMode: 'playlist' as 'playlist' | 'cart',
    audioContext: null as AudioContext | null,
    outputGainNode: null as GainNode | null,
    outputLimiterNode: null as DynamicsCompressorNode | null,
    outputAnalyserNodes: null as StereoAnalyserObject | null,
    selectedSound: null as SoundModel | null,
    editedSound: null as SoundModel | null,
    stoppedByButtonClick: false,
    isReordering: false,
    showEditWindow: false as boolean,
    showReorderWindow: false as boolean,
    showSettingsWindow: false as boolean,
    selectedSoundVolumeSliderValue: 0.0 as number,
    selectedSoundVolume: 0.0 as number,
    momentaryLoudness: { value: 0.0 as number },
    faderTouchedDuringPlayback: false as boolean,
    sampleRate: 0 as number,
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

    loadSound(name: string, file: File) {
      const audioElement = document.createElement('audio');
      audioElement.preload = 'metadata';
      const url = URL.createObjectURL(file);
      audioElement.src = url;

      audioElement.onloadedmetadata = async () => {
        if (this.audioContext === null) {
          this.initAudioContext();
          if (this.audioContext === null) return;
        }

        const source = this.audioContext.createMediaElementSource(audioElement);
        /*const trimGainNode = this.audioContext.createGain();
        const volumeGainNode = this.audioContext.createGain();
        const enveloppeGainNode = this.audioContext.createGain(); */

        /* source.connect(trimGainNode);
        trimGainNode.connect(volumeGainNode);
        volumeGainNode.connect(enveloppeGainNode);
        enveloppeGainNode.connect(this.outputGainNode!); */

        const defaultEnveloppePoints = [
          { time: 0, gainDb: 0 },
          { time: audioElement.duration, gainDb: 0 },
        ] as EnveloppePoint[];

        let addedSound: SoundModel = {
          id: uuidv4(),
          file: file,
          name: name,
          audioElement: audioElement,
          duration: audioElement.duration,
          remainingTime: audioElement.duration,
          progressIn0to1: 0,
          isPlaying: false,
          isSelected: false,
          isCuePlayed: false,
          url: url,
          trimGain: 0.0,
          source: source,
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
        };

        let arrayToAdd = 0;
        if (this.playerMode === 'cart') {
          arrayToAdd = this.sounds[0].length > this.sounds[1].length ? 1 : 0;
        }

        addedSound = reactive(addedSound);

        registerEventListeners(addedSound);
        this.sounds[arrayToAdd].push(addedSound);

        if (this.sounds[0].length === 1 && this.playerMode === 'playlist') {
          this.sounds[0][0].isSelected = true;
        }

        if (this.selectedSound === null && this.playerMode === 'playlist') {
          setSelectedSound(addedSound);
        }

        if (this.settingsStore.autoNormalize) {
          normalizeSound(addedSound, this.settingsStore.normalizationLuTarget);
        }
      };
    },

    deleteSound(sound: SoundModel) {
      let array = -1;
      let index = this.sounds[0].indexOf(sound);
      if (index !== -1) {
        array = 0;
      } else {
        index = this.sounds[1].indexOf(sound);
        if (index !== -1) {
          array = 1;
        }
      }

      if (!sound.isPlaying) {
        this.showEditWindow = false;
        this.sounds[array].splice(index, 1);
        if (sound.isSelected) {
          this.selectedSound = null;
          if (this.sounds[0].length > 0 && this.playerMode === 'playlist') {
            setSelectedSound(this.sounds[0][0]);
          }
        }
      }
    },

    setEditedSound(sound: SoundModel) {
      this.editedSound = sound;
    },

    initializeCartPlayer() {
      this.selectedSound = null;
      this.sounds.forEach((soundArray) => {
        soundArray.forEach((sound) => {
          sound.isSelected = false;
        });
      });
    },
  },
});
