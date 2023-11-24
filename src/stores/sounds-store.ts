import { reactive } from 'vue';
import { defineStore } from 'pinia';
import { useSettingsStore } from './settings-store';
import { v4 as uuidv4 } from 'uuid';
import { SoundModel, StereoAnalyserObject } from 'src/components/models';
import {
  playSound,
  stopSound,
  normalizeSound,
  getIsCuePlayed,
  generateWaveformData,
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
    addSound(sound: SoundModel, soundArray = 0) {
      if (this.settingsStore.autoNormalize) {
        normalizeSound(sound, this.settingsStore.normalizationLuTarget);
      }

      sound = reactive(sound);

      generateWaveformData(sound, this.sampleRate);

      this.registerEventListeners(sound);

      this.sounds[soundArray].push(sound);

      playSound(sound);
      stopSound(sound);

      if (
        this.sounds[soundArray].length === 1 &&
        this.playerMode === 'playlist'
      ) {
        this.sounds[0][0].isSelected = true;
      }
    },

    registerEventListeners(sound: SoundModel) {
      sound.audioElement.addEventListener('play', () =>
        this.handlePlayEvent(sound)
      );
      sound.audioElement.addEventListener('pause', () =>
        this.handlePauseEvent(sound)
      );
      sound.audioElement.addEventListener('ended', () =>
        this.handleEndedEvent(sound)
      );
      sound.audioElement.addEventListener('timeupdate', () =>
        this.handleTimeUpdateEvent(sound)
      );
    },

    handlePlayEvent(sound: SoundModel) {
      sound.isPlaying = true;
    },

    handlePauseEvent(sound: SoundModel) {
      console.log('pause event');
      sound.isPlaying = false;
      sound.audioElement.currentTime = 0;
      sound.volumeGainNode.gain.value = 1;
      if (!getIsCuePlayed(sound)) {
        this.resetSelectedSoundVolume();
        if (Date.now() - sound.launchTime > this.settingsStore.falseStartTime) {
          this.incrementSelectedSound();
        } else if (sound.duration < 1) this.incrementSelectedSound();
      }
      sound.isCuePlayed = false;
    },

    handleEndedEvent(sound: SoundModel) {
      console.log('ended event');
      /* sound.isPlaying = false;
      sound.audioElement.currentTime = 0;
      sound.remainingTime = sound.duration;
      if (!getIsCuePlayed(sound)) {
        this.incrementSelectedSound();
        this.resetSelectedSoundVolume();
      }
      sound.isCuePlayed = false; */
    },

    handleTimeUpdateEvent(sound: SoundModel) {
      const remainingTime =
        sound.audioElement.duration - sound.audioElement.currentTime;
      if (Number.isNaN(remainingTime)) {
        sound.remainingTime = sound.audioElement.duration;
      } else {
        sound.remainingTime = remainingTime;
      }
      sound.progressIn0to1 =
        sound.audioElement.currentTime / sound.audioElement.duration;
    },

    deleteSound(sound: SoundModel) {
      //search for the sound in the sounds arrays
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
            this.setSelectedSound(this.sounds[0][0]);
          }
        }
      }
    },

    setSelectedSound(sound: SoundModel) {
      let isPlaying = false;
      this.sounds[0].forEach((sound) => {
        if (sound.isPlaying) isPlaying = true;
      });
      if (!isPlaying) {
        this.sounds[0].forEach((sound) => (sound.isSelected = false));
        sound.isSelected = true;
        this.selectedSound = sound;
        this.resetSelectedSoundVolume();
      }
    },

    setEditedSound(sound: SoundModel) {
      this.editedSound = sound;
    },

    loadSound(name: string, file: File) {
      const uuid = uuidv4();
      const audioElement = document.createElement('audio');
      audioElement.preload = 'metadata';
      const url = URL.createObjectURL(file);
      audioElement.src = url;

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
          remainingTime: audioElement.duration,
          progressIn0to1: 0,
          isPlaying: false,
          isSelected: false,
          isCuePlayed: false,
          url: url,
          trimGain: 0.0,
          source: source,
          trimGainNode: trimGainNode,
          volumeGainNode: volumeGainNode,
          inTime: null,
          outTime: null,
          integratedLoudness: null,
          hpfEnabled: false,
          hpfFrequency: 80,
          hpfNode: hpfNode,
          launchTime: 0,
          waveform: new Float32Array(0),
          waveformCalculated: false,
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
      this.sampleRate = this.audioContext.sampleRate;

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

      calculateMomentaryLoudness(
        this.outputAnalyserNodes.stereoAnalyser,
        this.momentaryLoudness
      );
    },

    playButtonClicked() {
      if (this.selectedSound?.isPlaying) {
        if (this.selectedSound === null) return;
        this.stoppedByButtonClick = true;
        this.selectedSound.audioElement?.pause();
      } else {
        this.playSelectedSound();
      }
    },

    stopSelectedSound() {
      if (this.selectedSound === null) return;
      stopSound(this.selectedSound);
    },

    playSelectedSound() {
      const selectedSound = this.selectedSound;
      if (selectedSound === null) return;
      playSound(selectedSound);
    },

    incrementSelectedSound() {
      if (this.selectedSound === null) return;
      const index = this.sounds[0].indexOf(this.selectedSound);
      if (index < this.sounds[0].length - 1) {
        this.setSelectedSound(this.sounds[0][index + 1]);
      }
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
