import { StereoAnalyserObject } from 'src/components/models';
import Konva from 'konva';
import { RecordedSound } from 'src/components/models';

export interface Marker {
  xPos: number;
  color: string;
  line: Konva.Line;
}
export class RecorderWaveform {
  private waveformView: HTMLDivElement;
  private stereoAnalyser: StereoAnalyserObject;

  private stage: Konva.Stage;
  private layer: Konva.Layer;
  private waveform: Konva.Line;
  private anim: Konva.Animation;

  private peakValuesL: number[];
  private peakValuesR: number[];

  private color = 'orange';

  private markers: Marker[] = [];

  private shouldCollectPeakValues = false;

  private peaksValues = [new DynamicFloat32Array(), new DynamicFloat32Array()];
  private recordedPeaksValues = [new Float32Array(), new Float32Array()];

  private waveformToDraw = 'realtime' as 'realtime' | 'recorded';

  constructor(
    waveformView: HTMLDivElement,
    stereoAnalyser: StereoAnalyserObject
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
    this.waveform = new Konva.Line();
    this.layer.add(this.waveform);

    this.anim = new Konva.Animation(() => {
      if (this.waveformToDraw === 'realtime') this.drawRealTimeWaveform();
      else if (this.waveformToDraw === 'recorded') this.drawRecordedWaveform();
    }, this.layer);

    this.peakValuesL = new Array(this.waveformView.clientWidth).fill(0);
    this.peakValuesR = new Array(this.waveformView.clientWidth).fill(0);

    this.start();
  }

  public start() {
    this.anim.start();
  }

  public stop() {
    this.anim.stop();
  }

  public setWaveformToDraw(waveformToDraw: 'realtime' | 'recorded') {
    this.waveformToDraw = waveformToDraw;
    this.deleteAllMarkers();
    this.start();
  }

  private drawRealTimeWaveform() {
    const bufferLength = this.stereoAnalyser.analysers[0].frequencyBinCount;
    const dataArrayL = new Float32Array(bufferLength);
    const dataArrayR = new Float32Array(bufferLength);
    this.stereoAnalyser.analysers[0].getFloatTimeDomainData(dataArrayL);
    this.stereoAnalyser.analysers[1].getFloatTimeDomainData(dataArrayR);

    const maxValueL = Math.max(...dataArrayL);
    const maxValueR = Math.max(...dataArrayR);

    this.peakValuesL.push(maxValueL);
    this.peakValuesR.push(maxValueR);

    if (this.shouldCollectPeakValues) {
      this.peaksValues[0].addData(new Float32Array([maxValueL]));
      this.peaksValues[1].addData(new Float32Array([maxValueR]));
    }

    if (this.peakValuesL.length > this.waveformView.clientWidth) {
      this.peakValuesL.shift();
      this.peakValuesR.shift();
    }

    const points = [] as number[];
    points.push(0, this.waveformView.clientHeight / 2);
    for (let i = 0; i < this.peakValuesL.length; i++) {
      points.push(
        i,
        (this.peakValuesR[i] / 2) * this.waveformView.clientHeight +
          this.waveformView.clientHeight / 2
      );
    }
    for (let i = this.peakValuesL.length - 1; i >= 0; i--) {
      points.push(
        i,
        (-this.peakValuesL[i] / 2) * this.waveformView.clientHeight +
          this.waveformView.clientHeight / 2
      );
    }
    points.push(0, this.waveformView.clientHeight / 2);

    this.waveform.points(points);
    this.waveform.stroke(this.color);
    this.waveform.fill(this.color);
    this.waveform.strokeWidth(1);
    this.waveform.closed(true);

    this.markers.forEach((marker) => {
      marker.xPos--;
      marker.line.points([
        marker.xPos,
        0,
        marker.xPos,
        this.waveformView.clientHeight,
      ]);
      if (marker.xPos < 0) {
        this.deleteMarker(marker);
      }
    });
  }

  private drawRecordedWaveform() {
    const startTime = performance.now();
    const points = [] as number[];
    const peaksLength = this.recordedPeaksValues[0].length;
    const valuesToFind = peaksLength / this.waveformView.clientWidth;
    for (let i = 0; i < this.waveformView.clientWidth; i++) {
      const peakValueL =
        this.recordedPeaksValues[0][Math.floor(i * valuesToFind)];
      const peakValueR =
        this.recordedPeaksValues[1][Math.floor(i * valuesToFind)];
      points.push(
        i,
        (peakValueR / 2) * this.waveformView.clientHeight +
          this.waveformView.clientHeight / 2
      );
      points.push(
        i,
        (-peakValueL / 2) * this.waveformView.clientHeight +
          this.waveformView.clientHeight / 2
      );
    }

    this.waveform.points(points);
    this.waveform.stroke(this.color);
    this.waveform.fill(this.color);
    this.waveform.strokeWidth(1);
    this.waveform.closed(true);

    this.stop();

    const endTime = performance.now();
    console.log('Drawing waveform took', endTime - startTime, 'ms');
  }

  public addMarker(color: string) {
    this.markers.push({
      xPos: this.waveformView.clientWidth - 1,
      color: color,
      line: new Konva.Line({
        points: [
          this.waveformView.clientWidth - 1,
          0,
          this.waveformView.clientWidth - 1,
          this.waveformView.clientHeight,
        ],
        stroke: color,
        strokeWidth: 2,
      }),
    });

    this.layer.add(this.markers[this.markers.length - 1].line);
  }

  private deleteMarker(marker: Marker) {
    marker.line.destroy();
    this.markers = this.markers.filter((m) => m !== marker);
  }

  private deleteAllMarkers() {
    this.markers.forEach((marker) => {
      marker.line.destroy();
    });
    this.markers = [];
  }

  public setWaveformColor(color: string) {
    this.color = color;
  }

  public resetWaveform() {
    this.peakValuesL = new Array(this.waveformView.clientWidth).fill(0);
    this.peakValuesR = new Array(this.waveformView.clientWidth).fill(0);
  }

  public startCollectingPeakValues() {
    this.shouldCollectPeakValues = true;
  }

  public stopCollectingPeakValues() {
    this.shouldCollectPeakValues = false;
    this.recordedPeaksValues[0] = new Float32Array(
      this.peaksValues[0].getData()
    );
    this.recordedPeaksValues[1] = new Float32Array(
      this.peaksValues[1].getData()
    );
    this.peaksValues[0].clearData();
    this.peaksValues[1].clearData();
  }

  public getPeakValues() {
    const peakValues = [
      this.recordedPeaksValues[0],
      this.recordedPeaksValues[1],
    ];
    return peakValues;
  }
}

export class DynamicFloat32Array {
  private buffer: Float32Array;

  constructor() {
    this.buffer = new Float32Array(0);
  }

  addData(data: Float32Array) {
    const newBuffer = new Float32Array(this.buffer.length + data.length);
    newBuffer.set(this.buffer);
    newBuffer.set(data, this.buffer.length);
    this.buffer = newBuffer;
  }

  getData(): Float32Array {
    return this.buffer;
  }

  clearData() {
    this.buffer = new Float32Array(0);
  }
}
