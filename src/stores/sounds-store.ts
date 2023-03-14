import { defineStore } from 'pinia';
import { useSettingsStore } from './settings-store';
import { v4 as uuidv4 } from 'uuid';
import { SoundModel, StereoAnalyserObject } from 'src/components/models';
import {
  playSound,
  setTrimGain,
  normalizeSound,
} from 'src/composables/sound-controller';
import {
  calculateIntegratedLoudness,
  calculateMomentaryLoudness,
} from 'src/composables/loudness-calculation';

export const useSoundsStore = defineStore('soundsStore', {
  state: () => ({
    settingsStore: useSettingsStore(),
    sounds: [[], []] as [SoundModel[], SoundModel[]],
    playerMode: 'playlist' as 'playlist' | 'cart',
    audioContext: null as AudioContext | null,
    outputGainNode: null as GainNode | null,
    outputLimiterNode: null as DynamicsCompressorNode | null,
    outputAnalyserNodes: null as StereoAnalyserObject | null,
    isPlaying: false,
    selectedSound: null as SoundModel | null,
    editedSound: null as SoundModel | null,
    stoppedByButtonClick: false,
    isReordering: false,
    showEditWindow: false as boolean,
    selectedSoundVolumeSliderValue: 0.0 as number,
    selectedSoundVolume: 0.0 as number,
    momentaryLoudness: { value: 0.0 as number },
  }),

  actions: {
    addSound(sound: SoundModel, soundArray = 0) {
      if (this.settingsStore.autoNormalize) {
        normalizeSound(sound);
      }
      this.sounds[soundArray].push(sound);

      if (
        this.sounds[soundArray].length === 1 &&
        this.playerMode === 'playlist'
      ) {
        this.sounds[0][0].isSelected = true;
      }
    },

    deleteSound(sound: SoundModel) {
      const index = this.sounds[0].indexOf(sound);
      if (!sound.isPlaying) {
        this.showEditWindow = false;
        this.sounds[0].splice(index, 1);
        if (sound.isSelected) {
          this.selectedSound = null;
          if (this.sounds[0].length > 0) {
            this.setSelectedSound(this.sounds[0][0]);
          }
        }
      }
    },

    setSelectedSound(sound: SoundModel) {
      if (!this.isPlaying) {
        this.sounds[0].forEach((sound) => (sound.isSelected = false));
        sound.isSelected = true;
        this.selectedSound = sound;
        this.resetSelectedSoundVolume();
      }
    },

    setEditedSound(sound: SoundModel) {
      this.editedSound = sound;
    },

    async loadSound(name: string, file: File) {
      const uuid = uuidv4();
      const audioElement = document.createElement('audio');
      audioElement.preload = 'metadata';
      const url = URL.createObjectURL(file);
      audioElement.src = url;

      audioElement.addEventListener('play', () => {
        if (this.selectedSound === null) return;
        this.selectedSound.isPlaying = true;
        this.isPlaying = true;
      });
      audioElement.addEventListener('pause', () => {
        if (this.selectedSound === null) return;
        this.selectedSound.isPlaying = false;
        this.isPlaying = false;
        audioElement.currentTime = 0;
        this.resetSelectedSoundVolume();
      });
      audioElement.addEventListener('ended', () => {
        if (this.selectedSound === null) return;
        this.selectedSound.isPlaying = false;
        this.isPlaying = false;
        this.incrementSelectedSound();
        this.resetSelectedSoundVolume();
      });
      audioElement.addEventListener('timeupdate', () => {
        if (this.selectedSound === null) return;
        this.selectedSound.currentTime = audioElement.currentTime;
        const remainingTime = audioElement.duration - audioElement.currentTime;
        if (Number.isNaN(remainingTime)) {
          this.selectedSound.remainingTime = audioElement.duration;
        } else {
          this.selectedSound.remainingTime = remainingTime;
        }
        this.selectedSound.progressIn0to1 =
          audioElement.currentTime / audioElement.duration;
      });

      audioElement.onloadedmetadata = () => {
        if (this.audioContext === null) {
          this.initAudioContext();
          if (this.audioContext === null) return;
        }
        const source = this.audioContext.createMediaElementSource(audioElement);
        const trimGainNode = this.audioContext.createGain();
        const volumeGainNode = this.audioContext.createGain();
        const hpfNode = this.audioContext.createBiquadFilter();
        source.connect(hpfNode);
        hpfNode.connect(trimGainNode);
        hpfNode.type = 'highpass';
        trimGainNode.connect(volumeGainNode);
        if (this.outputGainNode === null) return;
        volumeGainNode.connect(this.outputGainNode);
        const addedSound: SoundModel = {
          id: uuid,
          file: file,
          name: name,
          audioElement: audioElement,
          duration: audioElement.duration,
          currentTime: 0,
          remainingTime: audioElement.duration,
          progressIn0to1: 0,
          isPlaying: false,
          isSelected: false,
          url: url,
          trimGain: 0.0,
          source: source,
          trimGainNode: trimGainNode,
          volumeGainNode: volumeGainNode,
          inTime: null,
          outTime: null,
          integratedLoudness: null,
          hpfEnabled: true,
          hpfFrequency: 80,
          hpfNode: hpfNode,
        };

        if (this.playerMode === 'playlist') {
          this.addSound(addedSound);
        } else if (this.playerMode === 'cart') {
          const firstArrayLength = this.sounds[0].length;
          const secondArrayLength = this.sounds[1].length;
          if (firstArrayLength === secondArrayLength) {
            this.addSound(addedSound, 0);
          } else if (firstArrayLength > secondArrayLength) {
            this.addSound(addedSound, 1);
          } else if (firstArrayLength < secondArrayLength) {
            this.addSound(addedSound, 0);
          }
        }

        if (this.selectedSound === null && this.playerMode === 'playlist') {
          this.setSelectedSound(addedSound);
        }
      };
    },

    initAudioContext() {
      this.audioContext = new AudioContext();

      this.outputGainNode = this.audioContext.createGain();
      this.outputLimiterNode = this.audioContext.createDynamicsCompressor();
      this.outputAnalyserNodes = {
        splitter: this.audioContext.createChannelSplitter(2),
        stereoAnalyser: this.audioContext.createAnalyser(),
        analysers: [
          this.audioContext.createAnalyser(),
          this.audioContext.createAnalyser(),
        ],
      };

      this.outputGainNode.connect(this.outputLimiterNode);
      this.outputLimiterNode.connect(this.outputAnalyserNodes.stereoAnalyser);
      this.outputLimiterNode.connect(this.outputAnalyserNodes.splitter);
      this.outputAnalyserNodes.splitter.connect(
        this.outputAnalyserNodes.analysers[0],
        0
      );
      this.outputAnalyserNodes.splitter.connect(
        this.outputAnalyserNodes.analysers[1],
        1
      );
      this.outputLimiterNode.connect(this.audioContext.destination);

      console.log('AudioContext initialized');
      calculateMomentaryLoudness(
        this.outputAnalyserNodes.stereoAnalyser,
        this.momentaryLoudness
      ).then((loudness) => {
        console.log('Momentary loudness: ' + loudness);
      });
    },

    playButtonClicked() {
      if (this.isPlaying) {
        if (this.selectedSound === null) return;
        this.stoppedByButtonClick = true;
        this.selectedSound.audioElement?.pause();
      } else {
        this.playSelectedSound();
      }
    },

    playSelectedSound() {
      const selectedSound = this.selectedSound;
      if (selectedSound === null) return;
      playSound(selectedSound);
    },

    incrementSelectedSound() {
      if (this.selectedSound === null) return;
      const index = this.sounds[0].indexOf(this.selectedSound);
      if (index < this.sounds.length - 1) {
        this.setSelectedSound(this.sounds[0][index + 1]);
      }
    },

    getSoundProgress() {
      if (this.selectedSound == null) return 0;
      return this.selectedSound.progressIn0to1;
    },

    resetSelectedSoundVolume() {
      this.selectedSoundVolume = 0.0;
    },

    //create a function to store the sound array in local storage
    saveSounds() {
      localStorage.setItem('sounds', JSON.stringify(this.sounds));
    },

    //create a function to load the sound array from local storage
    loadSounds() {
      if (localStorage.getItem('sounds')) {
        this.sounds = JSON.parse(localStorage.getItem('sounds') || '[]');
      }
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
