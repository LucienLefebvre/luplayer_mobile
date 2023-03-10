import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import { SoundModel } from 'src/components/models';
import { playSound } from 'src/composables/player-controller';
import { calculateIntegratedLoudness } from 'src/composables/loudness-calculation';

export const useSoundsStore = defineStore('soundsStore', {
  state: () => ({
    sounds: [] as SoundModel[],
    audioContext: null as AudioContext | null,
    outputGainNode: null as GainNode | null,
    outputLimiterNode: null as DynamicsCompressorNode | null,
    outputAnalyserNode: null as AnalyserNode | null,
    isPlaying: false,
    selectedSound: null as SoundModel | null,
    editedSound: null as SoundModel | null,
    stoppedByButtonClick: false,
    isReordering: false,
    showEditWindow: false as boolean,
    selectedSoundVolume: 0.0 as number,
  }),

  actions: {
    addSound(sound: SoundModel) {
      this.sounds.push(sound);
      if (this.sounds.length === 1) {
        this.sounds[0].isSelected = true;
      }
    },

    deleteSound(sound: SoundModel) {
      const index = this.sounds.indexOf(sound);
      if (!sound.isPlaying) {
        this.showEditWindow = false;
        this.sounds.splice(index, 1);
        if (sound.isSelected) {
          this.selectedSound = null;
          if (this.sounds.length > 0) {
            this.setSelectedSound(this.sounds[0]);
          }
        }
      }
    },

    setSelectedSound(sound: SoundModel) {
      if (!this.isPlaying) {
        this.sounds.forEach((sound) => (sound.isSelected = false));
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
        source.connect(trimGainNode);
        trimGainNode.connect(volumeGainNode);
        if (this.outputGainNode === null) return;
        volumeGainNode.connect(this.outputGainNode);
        const addedSound: SoundModel = {
          id: uuid,
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
          integratedLoudness: { value: -100 },
        };

        calculateIntegratedLoudness(file, addedSound.integratedLoudness);
        addedSound.wa;
        this.addSound(addedSound);
        if (this.selectedSound === null) {
          this.setSelectedSound(addedSound);
        }
      };
    },

    initAudioContext() {
      this.audioContext = new AudioContext();
      this.outputGainNode = this.audioContext.createGain();
      this.outputLimiterNode = this.audioContext.createDynamicsCompressor();
      this.outputAnalyserNode = this.audioContext.createAnalyser();
      this.outputGainNode.connect(this.outputLimiterNode);
      this.outputLimiterNode.connect(this.outputAnalyserNode);
      this.outputAnalyserNode.connect(this.audioContext.destination);
      this.outputAnalyserNode.smoothingTimeConstant = 1;
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
      const index = this.sounds.indexOf(this.selectedSound);
      if (index < this.sounds.length - 1) {
        this.setSelectedSound(this.sounds[index + 1]);
      }
    },

    getSoundProgress() {
      if (this.selectedSound == null) return 0;
      return this.selectedSound.progressIn0to1;
    },

    resetSelectedSoundVolume() {
      this.selectedSoundVolume = 0.0;
    },
  },
});
