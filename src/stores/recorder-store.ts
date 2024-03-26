import { defineStore } from 'pinia';
import { reactive, Ref, ref } from 'vue';
import { Dialog } from 'quasar';
import { v4 as uuidv4 } from 'uuid';

import { Recorder } from 'src/scripts/recorder';
import { RecorderWaveform } from 'src/scripts/recorder-waveform';
import {
  RecorderState,
  RecordedSound,
  SoundMarker,
} from 'src/components/models';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
import PeakMeter from 'src/components/PeakMeter.vue';
import { settings } from 'cluster';

export const useRecorderStore = defineStore('recorderStore', {
  state: () =>
    reactive({
      recorder: new Recorder(),
      waveform: null as RecorderWaveform | null,
      waveformView: null as HTMLDivElement | null,
      peakMeter: ref<typeof PeakMeter | null>(null),

      soundLibraryStore: useSoundLibraryStore(),

      currentSound: {
        id: uuidv4(),
        name: 'Recording',
        nameHasBeenEdited: false,
        markers: [],
        numberOfMarkersCreated: 0,
        totalLengthInMs: 0,
        peakData: [],
        isPlaying: false,
        showNameDialog: false,
        createdTimestamp: 0,
      } as RecordedSound,

      soundNameVModel: ref(''),

      trimGain: 0.0,
      hpfFrequency: 80,
      hpfEnabled: true,
      limiterThreshold: -1.0,
      limiterEnabled: true,
    }),

  getters: {},

  actions: {
    async init() {
      await this.initRecorder();
      await this.initWaveform();
      this.peakMeter?.value?.setAnalyserObject(this.recorder.stereoAnalyser);
    },

    async initRecorder() {
      try {
        await this.recorder.init();

        if (this.recorder.mediaRecorder) {
          this.recorder.mediaRecorder.onstart = () => {
            this.waveform?.startCollectingPeakValues();
            this.currentSound.createdTimestamp = Date.now();
            this.recorder.startTime = Date.now();
            this.recorder.state = RecorderState.RECORDING;
          };
          this.recorder.mediaRecorder.onstop = () => {
            this.currentSound.totalLengthInMs =
              this.getCurrentRecordingLengthInMS();
            this.recorder.state = RecorderState.STOPPED;

            if (this.waveform === null) return;
            this.waveform.stopCollectingPeakValues();
            this.currentSound.peakData = this.waveform.getPeakValues();
            this.waveform.setWaveformColor('orange');
          };
        }
      } catch (error) {
        console.error(error);
        Dialog.create({
          title: 'Microphone access is not allowed',
          style: 'background-color: var(--bkgColor); color: orange',
        });
      }
    },

    async initWaveform() {
      console.log('initWaveform');
      if (this.waveformView === null) return;
      if (this.recorder.stereoAnalyser === undefined) return;
      this.waveform = new RecorderWaveform(
        this.waveformView,
        this.recorder.stereoAnalyser,
        this.recorder.audioContext ?? new AudioContext()
      );

      await this.waveform.init();
    },

    startRecording() {
      this.soundLibraryStore.stopSelectedSound();
      this.resetState();
      this.recorder.setRecordedSound(this.currentSound);
      this.recorder.startRecording();
      this.waveform?.setWaveformColor('red');
      this.waveform?.resetWaveform();
    },

    stopRecording(save = true) {
      this.recorder.stopRecording(save);
      if (!save) this.resetState();
    },

    setRecordingMode() {
      this.waveform?.setWaveformToDraw('realtime');
      this.waveform?.setWaveformColor('orange');
      if (this.recorder.state) this.recorder.state = RecorderState.READY;
      //soundNameVModel.value = currentSound.value.name;
    },

    resetState() {
      const preEnteredName = this.currentSound.name;
      this.currentSound = this.getDefaultSound();
      if (this.recorder.state === RecorderState.READY) {
        this.currentSound.name = preEnteredName;
      }
      this.waveform?.resetWaveform();
      this.waveform?.deleteAllMarkers();
      this.setRecordingMode();
    },

    async initializePlayerMode(sound: RecordedSound) {
      if (this.recorder.state === RecorderState.NOT_INITIALIZED) {
        await this.init();
      }

      const audioElement = sound.audioElement;
      if (audioElement) {
        this.waveform?.setAudioElement(audioElement);
        this.waveform?.setSoundDuration(sound.totalLengthInMs / 1000);
        this.waveform?.setPeakValues(sound.peakData);
        this.waveform?.setWaveformToDraw('recorded');
        this.waveform?.setWaveformColor('orange');
        this.waveform?.deleteAllMarkers();
        this.waveform?.setMarkers(sound.markers);
        this.recorder.state = RecorderState.PLAYING_RECORDED_SOUND;
      }
    },

    getDefaultSound() {
      return {
        id: uuidv4(),
        name: 'Recording',
        nameHasBeenEdited: false,
        markers: [],
        numberOfMarkersCreated: 0,
        totalLengthInMs: 0,
        peakData: [],
        isPlaying: false,
        showNameDialog: false,
        createdTimestamp: 0,
      } as RecordedSound;
    },

    getCurrentRecordingLengthInMS() {
      if (this.recorder.state !== RecorderState.RECORDING) {
        return 0;
      } else {
        return Date.now() - this.recorder.startTime;
      }
    },

    getMarkerArray(): SoundMarker[] {
      if (this.recorder.state === RecorderState.RECORDING) {
        const proxy = [...this.currentSound.markers];
        return this.sortMarkersArrayByTime(proxy);
      } else if (this.recorder.state === RecorderState.PLAYING_RECORDED_SOUND) {
        const proxy = [
          ...(this.soundLibraryStore.selectedSound?.markers ?? []),
        ];
        return this.sortMarkersArrayByTime(proxy, false);
      } else {
        return [];
      }
    },

    sortMarkersArrayByTime(array: SoundMarker[], reverse = true) {
      if (!reverse)
        return array.sort((a, b) => a.positionInMs - b.positionInMs);
      return array.sort((a, b) => b.positionInMs - a.positionInMs);
    },

    addMarker() {
      if (this.recorder.state === RecorderState.RECORDING) {
        this.waveform?.addMarker('rgb(40, 134, 189)');
        this.currentSound.markers?.push({
          id: uuidv4(),
          positionInMs: this.getCurrentRecordingLengthInMS(),
          name: 'Marker ' + (this.currentSound.numberOfMarkersCreated + 1),
          showDialog: false,
          nameHasBeenEdited: false,
        });
        this.currentSound.numberOfMarkersCreated++;
      }
    },

    deleteMarker(marker: SoundMarker) {
      if (this.recorder.state === RecorderState.RECORDING) {
        this.currentSound.markers = this.currentSound.markers.filter(
          (m) => m.id !== marker.id
        );
        this.waveform?.setMarkers(this.currentSound.markers);
      } else if (this.recorder.state === RecorderState.PLAYING_RECORDED_SOUND) {
        this.soundLibraryStore.selectedSound?.markers?.splice(
          this.soundLibraryStore.selectedSound?.markers?.indexOf(marker) ?? 0,
          1
        );
        this.waveform?.setMarkers(
          this.soundLibraryStore.selectedSound?.markers ?? []
        );
        this.soundLibraryStore.updateSoundMarkers(
          this.soundLibraryStore.selectedSound!
        );
      }
    },

    toggleHpf() {
      this.hpfEnabled = !this.hpfEnabled;
      this.recorder.setHpfState(this.hpfEnabled, this.hpfFrequency);
    },

    setHpfFrequency(frequency: number) {
      this.hpfFrequency = frequency;
      this.recorder.setHpfState(this.hpfEnabled, this.hpfFrequency);
    },

    toggleLimiter() {
      this.limiterEnabled = !this.limiterEnabled;
      this.recorder.setLimiterState(this.limiterEnabled, this.limiterThreshold);
    },

    setLimiterThreshold(threshold: number) {
      this.limiterThreshold = threshold;
      this.recorder.setLimiterState(this.limiterEnabled, this.limiterThreshold);
    },

    getButtonsColor() {
      switch (this.recorder.state) {
        case RecorderState.RECORDING:
          return 'red';
        case RecorderState.PLAYING_RECORDED_SOUND:
          return 'green';
        default:
          return 'orange';
      }
    },
  },
});
