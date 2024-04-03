import { Dialog } from 'quasar';
import { Directory } from '@capacitor/filesystem';
import {
  MediaRecorder as EMediaRecorder,
  IMediaRecorder,
  register,
} from 'extendable-media-recorder';
import { connect } from 'extendable-media-recorder-wav-encoder';
import { RecordedSound, RecorderState } from 'src/components/models';
import { useSoundLibraryStore } from 'src/stores/sound-library-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { dbToGain } from './math-helpers';
import { useRecorderStore } from 'src/stores/recorder-store';

const RECORDER_TIME_SLICE = 1000;
const PEAKS_RESOLUTION_MS = 20;

export class Recorder {
  state = RecorderState.NOT_INITIALIZED;
  _audioContext: AudioContext | null = null;

  recordedSound?: RecordedSound;

  audioInputDevices?: MediaDeviceInfo[];
  currentAudioInputDevice?: MediaDeviceInfo;

  //mediaRecorder?: MediaRecorder | InstanceType<typeof EMediaRecorder>;

  private _mediaRecorder:
    | MediaRecorder
    | InstanceType<typeof EMediaRecorder>
    | null = null;

  get mediaRecorder(): MediaRecorder | IMediaRecorder | null {
    return this._mediaRecorder;
  }
  set mediaRecorder(
    value: MediaRecorder | InstanceType<typeof EMediaRecorder>
  ) {
    this._mediaRecorder = value;
  }
  mediaStreamSource?: MediaStreamAudioSourceNode;

  private _gainNode: GainNode | null = null;
  private _hpfNode: BiquadFilterNode | null = null;
  private _streamDestinationNode: MediaStreamAudioDestinationNode | null = null;
  private _waveformAnalyser: {
    splitter: ChannelSplitterNode;
    analysers: AnalyserNode[];
  } | null = null;
  private _peakMeterAnalyser: {
    splitter: ChannelSplitterNode;
    analysers: AnalyserNode[];
  } | null = null;
  private _recorderWorker: AudioWorkletNode | null = null;

  recording = false;
  startTime = 0;
  shouldSaveSound = true;

  settingsStore = useSettingsStore();

  get audioContext(): AudioContext {
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
    console.log('Creating stream destination node');
    if (!this._streamDestinationNode) {
      this._streamDestinationNode =
        this.audioContext.createMediaStreamDestination();
    }
    return this._streamDestinationNode;
  }

  get hpfNode(): BiquadFilterNode {
    if (!this._hpfNode) {
      this._hpfNode = this.audioContext.createBiquadFilter();
      this._hpfNode.type = 'highpass';
      this._hpfNode.frequency.value = 80;
      this._hpfNode.Q.value = 0.7071;
    }
    return this._hpfNode;
  }

  get waveformAnalyser() {
    if (!this._waveformAnalyser) {
      console.log('Creating waveform analyser');
      const splitter = this.audioContext.createChannelSplitter(2);
      const analysers = [
        this.audioContext.createAnalyser(),
        this.audioContext.createAnalyser(),
      ];
      this._waveformAnalyser = {
        splitter: splitter,
        analysers: analysers,
      };
      splitter.connect(analysers[0], 0);
      splitter.connect(analysers[1], 1);
    }
    return this._waveformAnalyser;
  }

  get peakMeterAnalyser() {
    if (!this._peakMeterAnalyser) {
      console.log('Creating peak meter analyser');
      const splitter = this.audioContext.createChannelSplitter(2);
      const analysers = [
        this.audioContext.createAnalyser(),
        this.audioContext.createAnalyser(),
      ];
      this._peakMeterAnalyser = {
        splitter: splitter,
        analysers: analysers,
      };
      splitter.connect(analysers[0], 0);
      splitter.connect(analysers[1], 1);
    }
    return this._peakMeterAnalyser;
  }

  public async init() {
    try {
      console.log('Initializing recorder');
      await this.checkMediaDeviceSupport();
      await this.getInputDevices();
      await register(await connect());

      this.currentAudioInputDevice = await this.tryLastUsedInputDeviceOrDefault(
        this.audioInputDevices!
      );

      if (!this.currentAudioInputDevice) return;

      const inputDevices = await this.getInputDevices();
      const inputDevice = inputDevices[0];
      const stream = await navigator.mediaDevices.getUserMedia(
        this.getConstraints(inputDevice, this.settingsStore.agcEnabled)
      );

      this.mediaStreamSource =
        this.audioContext.createMediaStreamSource(stream);

      this.connectAudioNodes();

      this.mediaRecorder = await this.createMediaRecorder(
        this.settingsStore.fileFormat,
        this.streamDestinationNode.stream
      );

      this.state = RecorderState.READY;
    } catch (error) {
      throw error;
    }
  }

  private async handleDataAvailable(e: BlobEvent) {
    const soundLibraryStore = useSoundLibraryStore();
    const blobType =
      this.settingsStore.fileFormat === 'ogg' ? 'audio/ogg' : 'audio/wav';
    const blob = new Blob([e.data], { type: blobType });
    await soundLibraryStore.appendDataToFile(this.recordedSound!, blob);

    if (
      this.mediaRecorder?.state !== 'recording' &&
      this.settingsStore.showRecordedSoundWhenStopped
    ) {
      const recordedSounds = await soundLibraryStore.getRecordedSounds();
      const lastRecordedSound = recordedSounds[0];
      soundLibraryStore.setSelectedSound(lastRecordedSound);
    }
  }

  private async checkMediaDeviceSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('MediaDevices or getUserMedia is not supported');
    }
  }

  private connectAudioNodes() {
    this.mediaStreamSource?.connect(this.gainNode);
    this.gainNode.connect(this.hpfNode);

    this.hpfNode.connect(this.waveformAnalyser.splitter);
    this.hpfNode.connect(this.peakMeterAnalyser.splitter);
    const proxyNode = this.audioContext.createGain();
    this.hpfNode.connect(proxyNode);
    proxyNode.connect(this.streamDestinationNode);
  }

  private getConstraints(device: MediaDeviceInfo, agcEnabled: boolean) {
    const constraints = {
      audio: {
        deviceId: device.deviceId,
        echoCancellation: false,
        autoGainControl: agcEnabled,
        noiseCancellation: false,
      },
    };
    return constraints;
  }

  public async createMediaRecorder(
    fileFormat: 'ogg' | 'wav',
    stream: MediaStream
  ): Promise<IMediaRecorder | MediaRecorder> {
    let recorder;
    if (fileFormat === 'ogg') {
      const options = {
        mimeType: 'audio/webm; codecs=opus',
      };
      recorder = new MediaRecorder(stream, options);
    } else {
      recorder = new EMediaRecorder(stream, {
        mimeType: 'audio/wav',
      });
    }

    const recorderStore = useRecorderStore();
    recorder.onstart = () => {
      recorderStore.waveform?.setWaveformColor('red');
      recorderStore.waveform?.resetWaveform();
      recorderStore.waveform?.startCollectingPeakValues();
      recorderStore.currentSound.createdTimestamp = Date.now();
      this.startTime = Date.now();
      this.state = RecorderState.RECORDING;
    };

    recorder.onstop = () => {
      recorderStore.currentSound.totalLengthInMs =
        recorderStore.getCurrentRecordingLengthInMS();
      this.state = RecorderState.STOPPED;

      if (recorderStore.waveform === null) return;
      recorderStore.waveform?.stopCollectingPeakValues();
      recorderStore.currentSound.peakData =
        recorderStore.waveform.getPeakValues();
      recorderStore.soundLibraryStore.addRecordedSoundToLibrary(
        recorderStore.currentSound
      );
      //this.waveform.setWaveformColor('orange');
    };

    recorder.ondataavailable = async (e: any) => {
      this.handleDataAvailable(e);
    };

    return recorder;
  }

  public async changeMediaRecorderFormat(fileFormat: 'ogg' | 'wav') {
    if (this.state === RecorderState.RECORDING) {
      return;
    }

    this.settingsStore.fileFormat = fileFormat;
    this.settingsStore.saveSettings();

    if (this.state === RecorderState.NOT_INITIALIZED) {
      this.init();
      return;
    }

    console.log('Changing file format');
    const stream = this.streamDestinationNode.stream;
    this.mediaRecorder?.stop();
    this.mediaRecorder = await this.createMediaRecorder(fileFormat, stream);
  }

  public async getInputDevices(): Promise<MediaDeviceInfo[]> {
    const inputDevices = await navigator.mediaDevices.enumerateDevices();
    const audioInputDevices = inputDevices.filter(
      (device) => device.kind === 'audioinput'
    );
    if (audioInputDevices.length === 0) {
      useSettingsStore().numberOfDialogsShown++;
      Dialog.create({
        title: 'No input device found',
        style: 'background-color: var(--bkgColor); color: orange',
      }).onDismiss(() => {
        useSettingsStore().numberOfDialogsShown--;
      });
      throw new Error('No input device found');
    }
    this.audioInputDevices = audioInputDevices;
    return this.audioInputDevices;
  }

  public async changeInputDevice(
    deviceId: string,
    agcEnabled = this.settingsStore.agcEnabled
  ) {
    if (this.state === RecorderState.RECORDING) {
      return;
    }

    this.settingsStore.inputDeviceId = deviceId;
    this.settingsStore.saveSettings();

    if (this.state === RecorderState.NOT_INITIALIZED) {
      this.init();
      return;
    }

    this.currentAudioInputDevice = this.audioInputDevices?.find(
      (device) => device.deviceId === deviceId
    );

    const stream = await navigator.mediaDevices.getUserMedia(
      this.getConstraints(this.currentAudioInputDevice!, agcEnabled)
    );

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
        (device) => device.deviceId === this.settingsStore.inputDeviceId
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
    const soundLibraryStore = useSoundLibraryStore();

    if (this.recordedSound) {
      console.log('Creating new sound');
      this.recordedSound.path = await soundLibraryStore.createFile(
        this.recordedSound!
      );
      if (this.recordedSound.path === '') {
        return;
      }
    }

    this.mediaRecorder?.start(RECORDER_TIME_SLICE);
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

  public async setAgcEnabled(enabled: boolean) {
    await this.changeInputDevice(
      this.currentAudioInputDevice!.deviceId,
      enabled
    );
  }
}
