import { watch } from 'vue';
import {
  MediaRecorder as EMediaRecorder,
  register,
} from 'extendable-media-recorder';
import { connect } from 'extendable-media-recorder-wav-encoder';

import {
  RecordedSound,
  RecorderState,
  StereoAnalyserObject,
} from 'src/components/models';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { dbToGain } from './math-helpers';
import { Dialog } from 'quasar';
export class Recorder {
  state = RecorderState.NOT_INITIALIZED;
  _audioContext: AudioContext | null = null;
  chunks?: Blob[];

  recordedSound?: RecordedSound;

  audioInputDevices?: MediaDeviceInfo[];
  currentAudioInputDevice?: MediaDeviceInfo;

  mediaRecorder?: MediaRecorder | InstanceType<typeof EMediaRecorder>;
  mediaStreamSource?: MediaStreamAudioSourceNode;

  private _gainNode: GainNode | null = null;
  private _hpfNode: BiquadFilterNode | null = null;
  private _limiterNode: DynamicsCompressorNode | null = null;
  private _streamDestinationNode: MediaStreamAudioDestinationNode | null = null;
  private _stereoAnalyser: {
    splitter: ChannelSplitterNode;
    analysers: AnalyserNode[];
  } | null = null;

  recording = false;
  startTime = 0;
  shouldSaveSound = true;

  settingsStore = useSettingsStore();

  get audioContext(): AudioContext {
    console.log('Getting audio context');
    if (!this._audioContext) {
      this._audioContext = new AudioContext();
    }
    return this._audioContext;
  }

  get gainNode(): GainNode {
    if (!this._gainNode) {
      this._gainNode = this.audioContext.createGain();
    }
    return this._gainNode;
  }

  get streamDestinationNode(): MediaStreamAudioDestinationNode {
    if (!this._streamDestinationNode) {
      this._streamDestinationNode = new MediaStreamAudioDestinationNode(
        this.audioContext
      );
    }
    return this._streamDestinationNode;
  }

  get limiterNode(): DynamicsCompressorNode {
    if (!this._limiterNode) {
      this._limiterNode = new DynamicsCompressorNode(this.audioContext);
    }
    return this._limiterNode;
  }

  get hpfNode(): BiquadFilterNode {
    if (!this._hpfNode) {
      this._hpfNode = new BiquadFilterNode(this.audioContext);
      this._hpfNode.type = 'highpass';
      this._hpfNode.frequency.value = 0;
      this._hpfNode.Q.value = 0.7071;
    }
    return this._hpfNode;
  }

  get stereoAnalyser() {
    if (!this._stereoAnalyser) {
      this._stereoAnalyser = {
        splitter: this.audioContext.createChannelSplitter(2),
        analysers: [
          this.audioContext.createAnalyser(),
          this.audioContext.createAnalyser(),
        ],
      };
    }
    return this._stereoAnalyser;
  }

  public async init() {
    try {
      this.chunks = [];

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices or getUserMedia is not supported');
      }

      await this.getInputDevices();
      if (this.audioInputDevices?.length === 0 || !this.audioInputDevices) {
        Dialog.create({
          title: 'No input device found',
          style: 'background-color: var(--bkgColor); color: orange',
        });
        throw new Error('No input device found');
      }

      this.currentAudioInputDevice = await this.tryLastUsedInputDeviceOrDefault(
        this.audioInputDevices
      );

      if (!this.currentAudioInputDevice) return;
      const constraints = {
        audio: {
          deviceId: this.currentAudioInputDevice.deviceId,
          echoCancellation: false,
          autoGainControl: false,
          noiseCancellation: false,
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      this.mediaStreamSource =
        this.audioContext.createMediaStreamSource(stream);
      this.gainNode.disconnect();
      this.mediaStreamSource?.connect(this.gainNode);
      this.gainNode.connect(this.hpfNode);
      this.hpfNode.connect(this.limiterNode);
      this.limiterNode.connect(this.streamDestinationNode);

      if (this.settingsStore.recorder.fileFormat === 'ogg') {
        const options = {
          mimeType: 'audio/webm; codecs=opus',
          audioBitsPerSecond: 256000,
        };
        this.mediaRecorder = new MediaRecorder(
          this.streamDestinationNode.stream,
          options
        );
      } else {
        await register(await connect());
        this.mediaRecorder = new EMediaRecorder(
          this.streamDestinationNode.stream,
          { mimeType: 'audio/wav' }
        );
      }

      if (this.stereoAnalyser) {
        this.limiterNode?.connect(this.stereoAnalyser.splitter);
        this.stereoAnalyser.splitter.connect(
          this.stereoAnalyser.analysers[0],
          0
        );
        this.stereoAnalyser.splitter.connect(
          this.stereoAnalyser.analysers[1],
          1
        );
      }

      this.mediaRecorder.ondataavailable = (e: any) => {
        this.chunks?.push(e.data);
        const soundLibraryStore = useSoundLibraryStore();
        if (this.shouldSaveSound)
          soundLibraryStore.saveRecording(this.recordedSound!, this.chunks!);
        else this.shouldSaveSound = true;
      };

      this.state = RecorderState.READY;
    } catch (error) {
      throw error;
    }
  }

  public async getInputDevices(): Promise<MediaDeviceInfo[]> {
    const inputDevices = await navigator.mediaDevices.enumerateDevices();
    const audioInputDevices = inputDevices.filter(
      (device) => device.kind === 'audioinput'
    );
    console.log('Audio input devices: ', audioInputDevices);
    if (audioInputDevices.length === 0) {
      return [];
    }
    this.audioInputDevices = inputDevices.filter(
      (device) => device.kind === 'audioinput'
    );
    return this.audioInputDevices;
  }

  public async changeInputDevice(deviceId: string) {
    if (this.state === RecorderState.RECORDING) {
      return;
    }

    console.log('Changing input device to: ', deviceId);

    this.settingsStore.recorder.inputDeviceId = deviceId;
    this.settingsStore.saveSettings();

    if (this.state === RecorderState.NOT_INITIALIZED) {
      this.init();
      return;
    }

    this.currentAudioInputDevice = this.audioInputDevices?.find(
      (device) => device.deviceId === deviceId
    );

    const constraints = {
      audio: {
        deviceId: this.currentAudioInputDevice?.deviceId,
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource =
        this.audioContext?.createMediaStreamSource(stream);
      this.mediaStreamSource?.connect(this.gainNode!);
    }
  }

  private tryLastUsedInputDeviceOrDefault(
    devices: MediaDeviceInfo[]
  ): MediaDeviceInfo | undefined {
    try {
      const lastUsedInputDevice = devices.find(
        (device) =>
          device.deviceId === this.settingsStore.recorder.inputDeviceId
      );
      const defaultDevice = devices.find(
        (device) => device.deviceId === 'default'
      );
      if (lastUsedInputDevice) {
        return lastUsedInputDevice;
      } else if (defaultDevice) {
        return defaultDevice;
      } else if (devices.length > 0) {
        return devices[0];
      }
    } catch (error) {
      throw error;
    }
  }

  public setRecordedSound(sound: RecordedSound) {
    this.recordedSound = sound;
  }

  public async startRecording() {
    this.chunks = [];
    this.mediaRecorder?.start();
    this.shouldSaveSound = true;
  }

  public stopRecording(save = true) {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();

      if (!save) this.shouldSaveSound = false;
    }
  }

  public setTrimGain(gain: number) {
    if (this.audioContext && this.gainNode)
      this.gainNode.gain.setValueAtTime(
        dbToGain(gain),
        this.audioContext.currentTime
      );
  }

  public setHpfState(enabled: boolean, frequency: number) {
    if (this.hpfNode) this.hpfNode.frequency.value = enabled ? frequency : 0;
  }

  public setLimiterState(enabled: boolean, threshold: number) {
    if (this.limiterNode)
      this.limiterNode.threshold.value = enabled ? threshold : 0;
  }
}
