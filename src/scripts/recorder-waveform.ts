import { StereoAnalyserObject } from 'src/components/models';
import Konva from 'konva';
import { SoundMarker } from 'src/components/models';
import { logScaleFrom0to1, logScaleTo0to1 } from './math-helpers';
import { setInterval } from 'worker-timers';
export interface Marker {
  xPos: number;
  color: string;
  line: Konva.Line;
}
export class RecorderWaveform {
  private waveformView: HTMLDivElement;
  private waveformHeight = 0;
  private waveformWidth = 0;

  private stereoAnalyser: StereoAnalyserObject;

  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private layerBackground: Konva.Rect;
  private waveform: Konva.Line;
  private anim: Konva.Animation;

  private peakValuesL: number[];
  private peakValuesR: number[];

  private color = 'orange';

  private markers: Marker[] = [];

  private shouldCollectPeakValues = false;

  private peaksValues = [
    new DynamicTypedArray(Uint8Array),
    new DynamicTypedArray(Uint8Array),
  ];
  private recordedPeaksValues = [new Uint8Array(), new Uint8Array()];

  private waveformToDraw = 'realtime' as 'realtime' | 'recorded';

  private audioElement?: HTMLAudioElement;
  private soundDuration = 0;
  private playHeadMarker: Konva.Line;

  public shouldUpdateWaveform = true;

  constructor(
    waveformView: HTMLDivElement,
    stereoAnalyser: StereoAnalyserObject,
    audioContext: AudioContext
  ) {
    this.waveformView = waveformView;
    this.stereoAnalyser = stereoAnalyser;

    this.stage = new Konva.Stage({
      container: this.waveformView,
      width: this.waveformView.clientWidth,
      height: this.waveformView.clientHeight,
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    this.layerBackground = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.stage.width(),
      height: this.stage.height(),
      fill: 'transparent',
    });
    this.layer.add(this.layerBackground);

    this.waveform = new Konva.Line();
    this.waveform.lineCap('round');
    this.layer.add(this.waveform);

    this.anim = new Konva.Animation(() => {
      if (this.waveformToDraw === 'realtime') this.drawRealTimeWaveform();
      else if (this.waveformToDraw === 'recorded') this.drawRecordedWaveform();
    }, this.layer);

    this.peakValuesL = new Array(this.waveformView.clientWidth).fill(0);
    this.peakValuesR = new Array(this.waveformView.clientWidth).fill(0);

    this.playHeadMarker = new Konva.Line();
    this.playHeadMarker.points([0, 0, 0, this.waveformView.clientHeight]);
    this.playHeadMarker.stroke('green');
    this.playHeadMarker.strokeWidth(2);
    this.layer.add(this.playHeadMarker);
    this.playHeadMarker.visible(false);

    this.registerTouchEvents();

    this.start();
  }

  public start() {
    this.anim.start();
  }

  public stop() {
    this.anim.stop();
  }

  public async init() {
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        this.waveformHeight = entry.contentRect.height;
        this.waveformWidth = entry.contentRect.width;
      });
    });

    resizeObserver.observe(this.waveformView);

    setInterval(() => {
      if (!this.shouldUpdateWaveform) return;
      const startTime = performance.now();

      const bufferLength = this.stereoAnalyser.analysers[0].frequencyBinCount;

      const dataArrayL = new Uint8Array(bufferLength);
      const dataArrayR = new Uint8Array(bufferLength);

      this.stereoAnalyser.analysers[0].getByteTimeDomainData(dataArrayL);
      this.stereoAnalyser.analysers[1].getByteTimeDomainData(dataArrayR);

      let maxValueL = 0;
      let maxValueR = 0;
      for (let i = 0; i < bufferLength; i++) {
        const valueL = dataArrayL[i] - 128;
        const valueR = dataArrayR[i] - 128;
        if (valueL > maxValueL) {
          maxValueL = valueL;
        }
        if (valueR > maxValueR) {
          maxValueR = valueR;
        }
      }

      const logMaxValueL = logScaleTo0to1(maxValueL, 0, 128, 0.2);
      const logMaxValueR = logScaleTo0to1(maxValueR, 0, 128, 0.2);
      this.peakValuesL.push(logMaxValueL);
      this.peakValuesR.push(logMaxValueR);

      if (this.shouldCollectPeakValues) {
        this.peaksValues[0].addData(new Uint8Array([maxValueL]));
        this.peaksValues[1].addData(new Uint8Array([maxValueR]));
      }

      const numExcessValues = this.peakValuesL.length - this.waveformWidth;
      if (numExcessValues > 0) {
        this.peakValuesL.splice(0, numExcessValues);
        this.peakValuesR.splice(0, numExcessValues);

        this.markers.forEach((marker) => {
          marker.xPos -= numExcessValues;
          marker.line.points([
            marker.xPos,
            0,
            marker.xPos,
            this.waveformHeight,
          ]);
          if (marker.xPos < 0) {
            this.deleteMarker(marker);
          }
        });
      }

      const endTime = performance.now();
    }, 1000 / 30);
  }

  public setWaveformToDraw(waveformToDraw: 'realtime' | 'recorded') {
    this.waveformToDraw = waveformToDraw;
    if (waveformToDraw === 'recorded') this.playHeadMarker.visible(true);
    else if (waveformToDraw === 'realtime') this.playHeadMarker.visible(false);
    this.start();
  }

  private drawRealTimeWaveform() {
    const startTime = performance.now();
    let width = this.waveformWidth;
    if (width === 0) width = this.peakValuesL.length;
    const clientHeight = this.waveformHeight;
    const halfHeight = clientHeight / 2;

    const points = [0, halfHeight];
    for (let i = 0; i < this.peakValuesL.length; i++) {
      points.push(i, (this.peakValuesR[i] / 2) * clientHeight + halfHeight);
    }
    for (let i = this.peakValuesL.length - 1; i >= 0; i--) {
      points.push(i, (-this.peakValuesL[i] / 2) * clientHeight + halfHeight);
    }
    points.push(0, halfHeight);

    this.waveform.points(points);
    this.waveform.stroke(this.color);
    this.waveform.fill(this.color);
    this.waveform.strokeWidth(1);
    this.waveform.closed(true);

    const endTime = performance.now();
    //console.log('Time to draw waveform:', endTime - startTime);
  }

  private drawRecordedWaveform() {
    const points = [] as number[];
    const peaksLength = this.recordedPeaksValues[0].length;
    const valuesToFind = peaksLength / this.waveformWidth;

    points.push(0, this.waveformHeight / 2);
    for (let i = 0; i < this.waveformWidth; i++) {
      const peakValueR =
        this.recordedPeaksValues[1][Math.floor(i * valuesToFind)];
      const logValueR = logScaleTo0to1(peakValueR, 0, 128, 0.2);
      const value =
        (logValueR / 2) * this.waveformHeight + this.waveformHeight / 2;

      if (!isNaN(value)) points.push(i, value);
    }
    for (let i = this.waveformWidth - 1; i >= 0; i--) {
      const peakValueL =
        this.recordedPeaksValues[0][Math.floor(i * valuesToFind)];
      const logValueL = logScaleTo0to1(peakValueL, 0, 128, 0.2);
      const value =
        (-logValueL / 2) * this.waveformHeight + this.waveformHeight / 2;

      if (!isNaN(value)) points.push(i, value);
    }
    points.push(0, this.waveformHeight / 2);

    this.waveform.points(points);
    this.waveform.stroke(this.color);
    this.waveform.fill(this.color);
    this.waveform.strokeWidth(1);
    this.waveform.closed(true);

    if (this.audioElement) {
      const playHeadXPosition =
        (this.audioElement.currentTime / this.soundDuration) *
        this.waveformWidth;
      this.playHeadMarker.points([
        playHeadXPosition,
        0,
        playHeadXPosition,
        this.waveformHeight,
      ]);
    }
  }

  public addMarker(color: string) {
    this.markers.push({
      xPos: this.waveformWidth - 1,
      color: color,
      line: new Konva.Line({
        points: [
          this.waveformWidth - 1,
          0,
          this.waveformWidth - 1,
          this.waveformHeight,
        ],
        stroke: color,
        strokeWidth: 2,
      }),
    });

    this.layer.add(this.markers[this.markers.length - 1].line);
  }

  public deleteMarker(marker: Marker) {
    marker.line.destroy();
    this.markers = this.markers.filter((m) => m !== marker);
  }

  public deleteAllMarkers() {
    this.markers.forEach((marker) => {
      marker.line.destroy();
    });
    this.markers = [];
  }

  public setMarkers(markers: SoundMarker[]) {
    this.deleteAllMarkers();
    markers.forEach((marker) => {
      const x = this.timeToX(marker.positionInMs / 1000);
      const m: Marker = {
        xPos: x,
        color: 'rgb(40, 134, 189)',
        line: new Konva.Line({
          points: [x, 0, x, this.waveformHeight],
          stroke: 'rgb(40, 134, 189)',
          strokeWidth: 2,
        }),
      };
      this.markers.push(m);
      this.layer.add(m.line);
    });
  }

  public setWaveformColor(color: string) {
    this.color = color;
  }

  public resetWaveform() {
    this.peakValuesL = new Array(this.waveformView.clientWidth).fill(0);
    this.peakValuesR = new Array(this.waveformView.clientWidth).fill(0);
  }

  public setShouldUpdateWaveform(shouldUpdateWaveform: boolean) {
    this.shouldUpdateWaveform = shouldUpdateWaveform;
  }

  public startCollectingPeakValues() {
    this.shouldCollectPeakValues = true;
  }

  public stopCollectingPeakValues() {
    this.deleteAllMarkers();

    this.shouldCollectPeakValues = false;
    this.recordedPeaksValues[0] = new Uint8Array(this.peaksValues[0].getData());
    this.recordedPeaksValues[1] = new Uint8Array(this.peaksValues[1].getData());
    this.peaksValues[0].clearData();
    this.peaksValues[1].clearData();
  }

  public getPeakValues() {
    const peakValues = [
      new Uint8Array(this.recordedPeaksValues[0]),
      new Uint8Array(this.recordedPeaksValues[1]),
    ];
    console.log(peakValues);
    return peakValues;
  }

  public setPeakValues(peakValues: Uint8Array[]) {
    this.recordedPeaksValues = [
      new Uint8Array(peakValues[0]),
      new Uint8Array(peakValues[1]),
    ];

    console;
  }

  public setAudioElement(audioElement: HTMLAudioElement) {
    this.audioElement = audioElement;

    this.audioElement.onplay = () => {
      this.playHeadMarker.visible(true);
    };
    this.audioElement.onended = () => {
      this.playHeadMarker.visible(false);
    };
  }

  public setSoundDuration(duration: number) {
    this.soundDuration = duration;
  }

  private registerTouchEvents() {
    this.layer.on('touchstart', this.handleTouchStart);
    this.layer.on('touchmove', this.handleTouchMove);
  }

  private handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    e.evt.preventDefault();
    if (this.waveformToDraw === 'recorded' && this.audioElement) {
      const touch = e.evt.touches[0];
      const x = touch.clientX;
      this.audioElement.currentTime = this.xToTime(x);
      this.playHeadMarker.visible(true);
    }
  };

  private handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
    e.evt.preventDefault();
    if (this.waveformToDraw === 'recorded' && this.audioElement) {
      const touch = e.evt.touches[0];
      const x = touch.clientX;
      this.audioElement.currentTime = this.xToTime(x);
    }
  };

  private xToTime(x: number) {
    if (this.waveformToDraw === 'recorded' && this.audioElement)
      return (x / this.waveformWidth) * this.soundDuration;
    else return 0;
  }

  private timeToX(time: number) {
    if (this.waveformToDraw === 'recorded')
      return (time / this.soundDuration) * this.waveformWidth;
    else return 0;
  }
}

export class DynamicTypedArray<T extends Float32Array | Uint8Array> {
  private buffer: T;

  constructor(type: { new (length: number): T }) {
    this.buffer = new type(0);
  }

  addData(data: T) {
    const newBuffer = new (this.buffer.constructor as {
      new (length: number): T;
    })(this.buffer.length + data.length);
    newBuffer.set(this.buffer);
    newBuffer.set(data, this.buffer.length);
    this.buffer = newBuffer;
  }

  getData(): T {
    return this.buffer;
  }

  clearData() {
    this.buffer = new (this.buffer.constructor as { new (length: number): T })(
      0
    );
  }
}
