import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { debounce } from 'quasar';

import init, {
  calculate_waveform_chunks,
  calculate_y_value_array_from_chunks,
} from 'src/rust/waveform_process/pkg';
import { dbToGain } from './math-helpers';
import { NormalizableRange } from './normalizable-range';

let WINDOW_SIZE = 128;
const TOUCH_MOUSE_CLICK_TIME = 200;
const TOUCH_HOLD_TIME = 500;

export class Waveform {
  audioContext: AudioContext;

  private waveformView: HTMLDivElement;
  audioElement: HTMLAudioElement;

  public eventTarget = new EventTarget();
  private resizeObserver: ResizeObserver;

  private anim: Konva.Animation;
  private stage: Konva.Stage;
  public waveformLayer: Konva.Layer;
  private waveformLayerBackground: Konva.Rect;

  private globalWaveformChunks: Float32Array;
  private waveformCalculated: boolean;
  private diplayWaveformChunks: Float32Array;
  private displayChunkSize: number;

  private playedLine: Konva.Line;
  private remainingLine: Konva.Line;

  private verticalZoomFactor: number;
  private horizontalZoomFactor: number;

  private soundDuration: number;
  private startTime: number;
  private endTime: number;
  private previousStartTime: number;
  private previousEndTime: number;

  //private waveformShouldBeRedrawn: boolean;

  public isPlayPositionAlwaysOnCenter: boolean;
  public isDraggable: boolean;
  public isZoomable: boolean;

  public touchMouseDownTime: number;
  private touchHoldTimeout: ReturnType<typeof setTimeout> | null;

  private isDragging: boolean;
  private dragStartX: number;
  private dragStartY: number;
  private waveformDragStartTime: number;
  private waveformDragEndTime: number;
  private initialTouchDistance: number;
  private oldTimeDeltaX: number;
  public wasPlayingOnDragStart: boolean;

  private waveformStyle: 'line' | 'bars';
  private xResolution: number;
  private waveformBarsRect: Konva.Rect[];

  public strokeWaveform: boolean;
  public fillWaveform: boolean;
  public minimapRangeRectangleFillColor: string;
  public minimapRangeRectangleOpacity: number;
  public minimapRangeRectangleCornerRadius: number;

  public showPlayHead: boolean;
  public playHeadWidth: number;

  public showHorizontalLine: boolean;
  public horizontalLineColor: string;
  public horizontalLineSize: number;

  public inTime: number | null;
  public showInTime: boolean;
  public inTimeColor: string;
  public inTimeWidth: number;

  public outTime: number | null;
  public showOutTime: boolean;
  public outTimeColor: string;
  public outTimeWidth: number;

  private isMinimap: boolean;
  public minimapWaveformReference: Waveform | null;
  public zoomableWaveformReference: Waveform | null;
  private minimapRangeLayer: Konva.Layer | null;
  private minimapRangeRect: Konva.Rect | null;

  public name: string;

  private showEnveloppeOnWaveform: boolean;
  //private shouldRecalculateWaveformEnveloppe: boolean;
  private enveloppePointsLayer: Konva.Layer;
  private enveloppeLineLayer: Konva.Layer;
  private enveloppePoints: EnveloppePoint[];
  private enveloppePointsDisplayCircles: Konva.Circle[];
  private enveloppePointsDragCircles: Konva.Circle[];
  private enveloppePointsLine: Konva.Line[];
  private enveloppePointsValueLayer: Konva.Layer;
  private enveloppePointsValueText: Konva.Text;
  private enveloppePointsValueTextBackground: Konva.Rect;
  private enveloppeDragTimeoutID: ReturnType<typeof setTimeout> | null;
  public enveloppePointsDisplayCircleSize: number;
  public enveloppePointsDisplayCircleFillColor: string;
  public enveloppePointsDisplayCircleStrokeColor: string;
  public enveloppePointsDragCircleSize: number;
  private enveloppePointsNormRange: NormalizableRange;
  public enveloppeLineColor: string;
  public enveloppeLineSize: number;
  public enveloppeMaxGainDb: number;
  public enveloppeMinGainDb: number;
  public showLastClickedPoint: boolean;
  public lastClickedPointColor: string;
  public lastClickedPointIndex: number;

  private hasBeenCleanedUp: boolean;

  constructor(
    audioContext: AudioContext,
    waveformView: HTMLDivElement,
    audioElement: HTMLAudioElement,
    height = 100,
    isMinimap = false,
    minimapWaveformReference = null as Waveform | null,
    zoomedWaveformReference = null as Waveform | null
  ) {
    this.audioContext = audioContext;

    this.eventTarget = new EventTarget();

    const handleResized = debounce(() => {
      this.stage.width(this.waveformView.clientWidth);
      this.updateWaveform();
    }, 100);

    this.waveformView = waveformView;
    this.audioElement = audioElement;

    this.resizeObserver = new ResizeObserver(handleResized);
    this.resizeObserver.observe(this.waveformView);

    this.stage = new Konva.Stage({
      container: this.waveformView,
      width: this.waveformView.clientWidth,
      height: height,
    });

    this.globalWaveformChunks = new Float32Array(0);
    this.diplayWaveformChunks = new Float32Array(0);
    this.displayChunkSize = 0;
    this.waveformCalculated = false;

    this.waveformLayer = new Konva.Layer({});

    this.waveformLayerBackground = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.stage.width(),
      height: this.stage.height(),
      fill: 'transparent',
    });
    this.waveformLayer.add(this.waveformLayerBackground);

    this.stage.add(this.waveformLayer);

    this.playedLine = new Konva.Line();
    this.playedLine.closed(true);

    this.remainingLine = new Konva.Line();
    this.remainingLine.closed(true);

    this.soundDuration = audioElement.duration;
    this.startTime = 0;
    this.endTime = this.soundDuration;
    this.previousStartTime = 0;
    this.previousEndTime = 0;
    this.horizontalZoomFactor = 1;
    this.verticalZoomFactor = 1;

    this.isMinimap = isMinimap;
    this.minimapWaveformReference = minimapWaveformReference;
    this.zoomableWaveformReference = zoomedWaveformReference;

    this.isPlayPositionAlwaysOnCenter = false;
    this.isZoomable = this.isMinimap ? false : true;
    this.isDraggable = this.isMinimap ? false : true;
    this.isDragging = false;

    this.touchMouseDownTime = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.waveformDragStartTime = 0;
    this.waveformDragEndTime = this.soundDuration;
    this.initialTouchDistance = 0;
    this.oldTimeDeltaX = 0;
    this.touchHoldTimeout = null;
    this.wasPlayingOnDragStart = false;

    this.strokeWaveform = false;
    this.fillWaveform = true;

    this.showPlayHead = false;
    this.playHeadWidth = 2;

    this.waveformStyle = 'line';
    this.xResolution = 1;
    this.waveformBarsRect = new Array(2000)
      .fill(null)
      .map(() => new Konva.Rect());

    this.showHorizontalLine = false;
    this.horizontalLineColor = 'orange';
    this.horizontalLineSize = 1;

    this.minimapRangeLayer = null;
    this.minimapRangeRect = null;
    this.minimapRangeRectangleFillColor = 'grey';
    this.minimapRangeRectangleOpacity = 0.3;
    this.minimapRangeRectangleCornerRadius = 10;

    this.inTime = null;
    this.showInTime = false;
    this.inTimeColor = 'black';
    this.inTimeWidth = 1;
    this.outTime = null;
    this.showOutTime = false;
    this.outTimeColor = 'black';
    this.outTimeWidth = 1;

    this.name = '';

    this.showEnveloppeOnWaveform = false;
    //this.shouldRecalculateWaveformEnveloppe = false;
    this.enveloppePointsLayer = new Konva.Layer();
    this.enveloppeLineLayer = new Konva.Layer();
    this.enveloppePoints = [] as EnveloppePoint[];
    this.enveloppePointsDisplayCircles = [] as Konva.Circle[];
    this.enveloppePointsDragCircles = [] as Konva.Circle[];
    this.enveloppePointsLine = [] as Konva.Line[];
    this.enveloppePointsDisplayCircleSize = 7;
    this.enveloppePointsDisplayCircleFillColor = 'red';
    this.enveloppePointsDisplayCircleStrokeColor = 'black';
    this.enveloppePointsDragCircleSize = 15;
    this.enveloppeLineColor = 'red';
    this.enveloppeLineSize = 2;
    this.enveloppeMaxGainDb = 24;
    this.enveloppeMinGainDb = -100;
    this.enveloppePointsValueLayer = new Konva.Layer();
    this.enveloppePointsValueText = new Konva.Text();
    this.enveloppePointsValueTextBackground = new Konva.Rect();
    this.enveloppeDragTimeoutID = null;
    this.enveloppePointsNormRange = new NormalizableRange(-60, 0, 15);
    this.showLastClickedPoint = false;
    this.lastClickedPointColor = 'yellow';
    this.lastClickedPointIndex = -1;
    this.enveloppePointsValueLayer.add(this.enveloppePointsValueTextBackground);
    this.enveloppePointsValueLayer.add(this.enveloppePointsValueText);
    this.stage.add(this.enveloppePointsValueLayer);
    this.stage.add(this.enveloppeLineLayer);
    this.stage.add(this.enveloppePointsLayer);

    this.hasBeenCleanedUp = false;

    if (isMinimap) this.initMinimap();
    if (this.isPlayPositionAlwaysOnCenter) this.centerTimeRangeOnPlayPosition();
    this.registerEventsListeners();
    this.registerMouseEvents();

    this.anim = new Konva.Animation(() => {
      this.draw();
    }, this.waveformLayer);
    init().then(() => {
      this.launchAnimation();
    });
  }

  public launchAnimation() {
    if (!this.anim.isRunning() && this.diplayWaveformChunks) {
      this.waveformLayer.clearCache();
      this.anim.start();
    }
  }

  public stopAnimation() {
    if (this.anim.isRunning() && !this.isDragging) {
      this.anim.stop();
      if (this.waveformLayer.height() > 0 && this.waveformLayer.width() > 0)
        this.waveformLayer.cache();
    }
  }

  public addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    this.eventTarget.addEventListener(type, listener, options);
  }

  public removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ) {
    this.eventTarget.removeEventListener(type, listener, options);
  }

  private handleAudioElementUpdate = () => {
    if (this.hasBeenCleanedUp) return;
    if (this.isPlayPositionAlwaysOnCenter) this.centerTimeRangeOnPlayPosition();
    this.launchAnimation();
  };

  private registerEventsListeners() {
    this.audioElement.addEventListener('play', this.handleAudioElementUpdate);
    this.audioElement.addEventListener('pause', this.handleAudioElementUpdate);
    this.audioElement.addEventListener(
      'timeupdate',
      this.handleAudioElementUpdate
    );
  }

  private unregisterEventsListeners() {
    this.audioElement.removeEventListener(
      'play',
      this.handleAudioElementUpdate
    );
    this.audioElement.removeEventListener(
      'pause',
      this.handleAudioElementUpdate
    );
    this.audioElement.removeEventListener(
      'timeupdate',
      this.handleAudioElementUpdate
    );
  }

  private handleMouseDownTouchStart = (e: any) => {
    const debounceClick = debounce(
      () => {
        this.handleMouseTouchStart(e);
      },
      10,
      true
    );
    debounceClick();
  };

  private handleMouseUpTouchEnd = () => {
    if (this.touchHoldTimeout) clearTimeout(this.touchHoldTimeout);
    if (Date.now() - this.touchMouseDownTime < TOUCH_MOUSE_CLICK_TIME) {
      this.handleClick();
    }
    if (this.isDragging) {
      this.handleDragEnd();
    }
  };

  private handleMouseMoveTouchMove = (e: any) => {
    if (e.evt.touches && e.evt.touches.length > 1) {
      this.handleTouchPan(e);
    } else if (this.isDragging) {
      this.handleDrag();
    }
  };

  private handleWheel = (e: any) => {
    this.handleMouseWheel(e.evt);
  };

  private handleWaveformStartEndTimesChanged = () => {
    this.handleMinimapTimesChanged();
  };

  private registerMouseEvents() {
    this.waveformLayer?.on(
      'mousedown touchstart',
      this.handleMouseDownTouchStart
    );
    this.waveformLayer?.on('mouseup touchend', this.handleMouseUpTouchEnd);

    if (this.isZoomable) {
      this.waveformLayer?.on(
        'mousemove touchmove',
        this.handleMouseMoveTouchMove
      );
    }
    this.waveformLayer?.on('wheel', this.handleWheel);

    if (this.isMinimap && this.minimapWaveformReference !== null) {
      this.minimapWaveformReference.addEventListener(
        'waveformStartEndTimesChanged',
        this.handleWaveformStartEndTimesChanged
      );
    }
  }

  private deregisterMouseEvents() {
    this.waveformLayer?.off(
      'mousedown touchstart',
      this.handleMouseDownTouchStart
    );
    this.waveformLayer?.off('mouseup touchend', this.handleMouseUpTouchEnd);

    if (this.isZoomable) {
      this.waveformLayer?.off(
        'mousemove touchmove',
        this.handleMouseMoveTouchMove
      );
    }
    this.waveformLayer?.off('wheel', this.handleWheel);

    if (this.isMinimap && this.minimapWaveformReference !== null) {
      this.minimapWaveformReference.removeEventListener(
        'waveformStartEndTimesChanged',
        this.handleWaveformStartEndTimesChanged
      );
    }
  }

  private handleDragEnd() {
    const event = new CustomEvent('waveformDragEnd');
    this.eventTarget.dispatchEvent(event);
    this.wasPlayingOnDragStart = false;
    this.isDragging = false;
  }

  public handleMinimapTimesChanged() {
    if (this.isMinimap) this.drawMinimapRange();
    else this.draw();
  }

  public async calculateWaveformChunks(): Promise<Float32Array> {
    try {
      const buffer = await fetch(this.audioElement.src).then((response) =>
        response.arrayBuffer()
      );
      const audioBuffer = await this.audioContext.decodeAudioData(buffer);
      const leftChannelData = audioBuffer.getChannelData(0);
      let rightChannelData;
      if (audioBuffer.numberOfChannels > 1) {
        rightChannelData = audioBuffer.getChannelData(1);
      } else {
        rightChannelData = leftChannelData;
      }

      if (this.audioElement.duration < 2) WINDOW_SIZE = 8;

      this.globalWaveformChunks = calculate_waveform_chunks(
        leftChannelData,
        rightChannelData,
        WINDOW_SIZE
      );

      this.waveformCalculated = true;
      this.launchAnimation();
      this.calculateYValueArrayFromChunks();

      const event = new CustomEvent('waveformChunksCalculated');
      this.eventTarget.dispatchEvent(event);
    } catch (error) {
      console.error('Error:', error);
    }

    return this.globalWaveformChunks;
  }

  public async setWaveformChunks(waveformChunks: Float32Array) {
    this.globalWaveformChunks = waveformChunks;

    this.waveformCalculated = true;
    this.launchAnimation();
    await this.calculateYValueArrayFromChunks();
  }

  private async calculateYValueArrayFromChunks() {
    const waveformEnveloppeMultipliers = new Float32Array(this.stage.width());
    waveformEnveloppeMultipliers.fill(1);
    if (this.showEnveloppeOnWaveform) {
      this.recalculateWaveformEnveloppe(waveformEnveloppeMultipliers);
    }

    const startIndex = Math.floor(
      this.globalWaveformChunks.length * (this.startTime / this.soundDuration)
    );
    const endIndex = Math.floor(
      this.globalWaveformChunks.length * (this.endTime / this.soundDuration)
    );

    const clippedStartIndex = Math.floor(
      this.globalWaveformChunks.length *
        (Math.max(this.startTime, 0.0) / this.soundDuration)
    );
    const clippedEndIndex = Math.floor(
      this.globalWaveformChunks.length *
        (Math.min(this.endTime, this.soundDuration) / this.soundDuration)
    );

    const wasmDisplayChunks = calculate_y_value_array_from_chunks(
      this.globalWaveformChunks,
      waveformEnveloppeMultipliers,
      startIndex,
      endIndex,
      clippedStartIndex,
      clippedEndIndex,
      this.stage.width()
    );

    this.diplayWaveformChunks = wasmDisplayChunks;

    this.displayChunkSize =
      (clippedEndIndex - clippedStartIndex) / this.stage.width();
  }

  public recalculateWaveformEnveloppe(mutlipliers: Float32Array) {
    for (let i = 0; i < this.stage.width(); i += this.xResolution) {
      const time = this.xToTime(i);
      const enveloppeValue = this.getEnveloppeValueAtTime(time);
      mutlipliers[i] = dbToGain(enveloppeValue);
    }
  }

  private draw() {
    if (!this.waveformCalculated || this.diplayWaveformChunks === null) {
      return;
    }

    if (
      this.isPlayPositionAlwaysOnCenter &&
      !this.audioElement.paused &&
      !this.isDragging
    ) {
      this.centerTimeRangeOnPlayPosition();
    }
    this.drawWaveform();
  }

  public centerTimeRangeOnPlayPosition() {
    const playPosition = this.audioElement.currentTime;

    const visibleDuration = this.endTime - this.startTime;
    const visibleStart = playPosition - visibleDuration / 2;
    const visibleEnd = playPosition + visibleDuration / 2;

    this.setStartEndTimes(visibleStart, visibleEnd, true, false);
  }

  public setIsAlwaysCenteredOnPlayPosition(isAlwaysCentered: boolean) {
    this.isPlayPositionAlwaysOnCenter = isAlwaysCentered;
    if (isAlwaysCentered) this.centerTimeRangeOnPlayPosition();
  }

  private drawWaveform() {
    //const frameRedrawStartTime = performance.now();

    if (this.waveformStyle === 'line') this.drawLineWaveform();
    else if (this.waveformStyle === 'bars') this.drawBarsWaveform();

    if (this.showHorizontalLine) this.drawHorizontalLine();
    if (this.showPlayHead) this.drawPlayHead();
    if (this.showInTime) this.drawInTime();
    if (this.showOutTime) this.drawOutTime();
    if (this.enveloppePointsLayer.isVisible()) this.updateEnveloppePoints();
    //this.waveformLayer.batchDraw();
    //this.waveformLayer.cache();

    if (this.audioElement.paused && !this.isPlayPositionAlwaysOnCenter) {
      this.stopAnimation();
    }
    //const frameRedrawEndTime = performance.now();
    //const frameRedrawDuration = frameRedrawEndTime - frameRedrawStartTime;
    //console.log('frameRedrawDuration: ', frameRedrawDuration);
  }

  private drawBarsWaveform() {
    const middleY = this.stage.height() / 2;
    const length = this.diplayWaveformChunks.length;
    const progressX = Math.floor(this.timeToX(this.audioElement.currentTime));
    const stageHeight = this.stage.height();
    const xResolution = this.xResolution;
    const verticalZoomFactor = this.verticalZoomFactor;

    for (let i = 0; i < length; i += xResolution) {
      const yValue =
        middleY - this.diplayWaveformChunks[i] * middleY * verticalZoomFactor;

      const rect = this.waveformBarsRect[i];
      rect.x(i);
      rect.y(yValue);
      rect.width(xResolution);
      rect.height(stageHeight - 2 * yValue);
      rect.fill(i >= progressX ? 'orange' : 'green');
      rect.cornerRadius(5);
      rect.stroke(i > progressX ? 'darkorange' : 'darkgreen');

      this.waveformLayer.add(rect);
    }
  }

  private drawLineWaveform() {
    const points = this.createWaveformPoints();

    this.playedLine.points(points.playedPoints);
    this.remainingLine.points(points.remainingPoints);
    this.waveformLayer.add(this.playedLine);
    this.waveformLayer.add(this.remainingLine);
    this.waveformLayerBackground.moveToTop();
  }

  private createWaveformPoints(): {
    playedPoints: number[];
    remainingPoints: number[];
  } {
    //const start = performance.now();

    const width = this.stage.width();
    const height = this.stage.height();
    const ratio = this.verticalZoomFactor;
    const middleY = height / 2;
    const progressX = Math.floor(this.timeToX(this.audioElement.currentTime));

    this.waveformLayer.removeChildren();
    this.waveformLayer.add(this.waveformLayerBackground);

    const playedPoints = [0, middleY];
    const remainingPoints = [progressX, middleY];

    for (let i = 0; i < width; i += this.xResolution) {
      const yValue = middleY - this.diplayWaveformChunks[i] * middleY * ratio;
      const checkedYValue = Number.isNaN(yValue) ? middleY : yValue;

      if (i < progressX) {
        playedPoints.push(i, checkedYValue);
      } else {
        remainingPoints.push(i, checkedYValue);
      }
    }

    playedPoints.push(progressX, middleY);
    remainingPoints.push(width, middleY);

    for (let i = width; i >= 0; i -= this.xResolution) {
      if (i < progressX) {
        const yValue: number = height - playedPoints[2 * (i + 1) + 1];
        const checkedYValue = Number.isNaN(yValue) ? middleY : yValue;
        playedPoints.push(i, checkedYValue);
      } else {
        const yValue: number =
          height - remainingPoints[2 * (i - progressX + 1) + 1];
        const checkedYValue = Number.isNaN(yValue) ? middleY : yValue;
        remainingPoints.push(i, checkedYValue);
      }
    }

    return { playedPoints, remainingPoints };
  }

  private drawOutTime() {
    if (this.outTime === null) return;
    const position = this.timeToX(this.outTime);
    const outTimeLine = new Konva.Line({
      points: [position, 0, position, this.stage.height()],
      stroke: this.outTimeColor,
      strokeWidth: this.outTimeWidth,
    });
    this.waveformLayer.add(outTimeLine);
  }

  private drawInTime() {
    if (this.inTime === null) return;
    const position = this.timeToX(this.inTime);
    const inTimeLine = new Konva.Line({
      points: [position, 0, position, this.stage.height()],
      stroke: this.inTimeColor,
      strokeWidth: this.inTimeWidth,
    });
    this.waveformLayer.add(inTimeLine);
  }

  private drawPlayHead() {
    const progressX = this.isPlayPositionAlwaysOnCenter
      ? this.stage.width() / 2
      : this.timeToX(this.audioElement.currentTime);
    const playHead = new Konva.Line({
      points: [progressX, 0, progressX, this.stage.height()],
      stroke: 'green',
      strokeWidth: this.playHeadWidth,
    });
    this.waveformLayer.add(playHead);
  }

  private drawHorizontalLine() {
    const middleY = this.stage.height() / 2;
    const horizontalLine = new Konva.Line({
      points: [
        this.timeToX(0),
        middleY,
        this.timeToX(this.soundDuration),
        middleY,
      ],
      stroke: this.horizontalLineColor,
      strokeWidth: this.horizontalLineSize,
    });
    this.waveformLayer.add(horizontalLine);
  }

  private drawMinimapRange() {
    const width = this.stage.width();
    const height = this.stage.height();

    if (this.minimapWaveformReference === null) return;
    const rangeStartTime = this.minimapWaveformReference.startTime;
    const rangeEndTime = this.minimapWaveformReference.endTime;

    const rectStartX = Math.floor(
      (rangeStartTime / this.soundDuration) * width
    );
    const recWidth = Math.floor(
      ((rangeEndTime - rangeStartTime) / this.soundDuration) * width
    );

    if (this.minimapRangeRect === null) return;
    this.minimapRangeRect.x(rectStartX);
    this.minimapRangeRect.y(0);
    this.minimapRangeRect.width(recWidth);
    this.minimapRangeRect.height(height);

    if (this.minimapRangeLayer) this.minimapRangeLayer.draw();
  }

  private initMinimap() {
    this.minimapRangeLayer = new Konva.Layer();
    this.minimapRangeRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      fill: this.minimapRangeRectangleFillColor,
      cornerRadius: this.minimapRangeRectangleCornerRadius,
      opacity: this.minimapRangeRectangleOpacity,
      stroke: 'white',
      strokeWidth: 2,
    });

    this.minimapRangeRect.draggable(true);

    this.minimapRangeRect.dragBoundFunc((pos) => {
      const newY = 0;
      const newX = pos.x;
      return {
        x: newX,
        y: newY,
      };
    });

    this.minimapRangeRect.on('dragmove', () => {
      if (this.minimapWaveformReference === null) return;
      if (this.minimapRangeRect === null) return;

      if (this.minimapWaveformReference?.isPlayPositionAlwaysOnCenter) {
        const timeToSet = this.xToTime(
          this.minimapRangeRect.x() + this.minimapRangeRect.width() / 2
        );
        this.setCurrentPlayTime(timeToSet);
      } else {
        const newStartTime =
          (this.minimapRangeRect.x() / this.stage.width()) * this.soundDuration;
        const newEndTime =
          ((this.minimapRangeRect.x() + this.minimapRangeRect.width()) /
            this.stage.width()) *
          this.soundDuration;
        this.minimapWaveformReference.setStartEndTimes(
          newStartTime,
          newEndTime,
          false
        );
      }
    });

    this.minimapRangeLayer.add(this.minimapRangeRect);
    this.stage.add(this.minimapRangeLayer);

    this.drawMinimapRange();
  }

  private setCurrentPlayTime(time: number, shouldEmit = true) {
    if (time < 0 || time > this.soundDuration) return;
    this.audioElement.currentTime = time;

    if (shouldEmit) {
      const event = new CustomEvent('waveformStartEndTimesChanged');
      this.eventTarget.dispatchEvent(event);
    }
  }

  setMinimapRangeRectangleFillColor(color: string) {
    if (this.minimapRangeRect === null) return;

    this.minimapRangeRect.fill(color);
    this.drawMinimapRange();
  }

  setMinimapRangeRectangleOpacity(opacity: number) {
    if (this.minimapRangeRect === null) return;

    this.minimapRangeRect.opacity(opacity);
    this.drawMinimapRange();
  }

  setMinimapRangeRectangleCornerRadius(cornerRadius: number) {
    if (this.minimapRangeRect === null) return;

    this.minimapRangeRect.cornerRadius(cornerRadius);
    this.drawMinimapRange();
  }

  public updateWaveform() {
    //if (this.freezed) return;
    this.calculateYValueArrayFromChunks().then(() => {
      this.launchAnimation();
    });
  }

  private handleMouseTouchStart(e: KonvaEventObject<TouchEvent>) {
    if (e.evt.touches && e.evt.touches.length > 1) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      const touch1X = touch1.clientX;
      const touch2X = touch2.clientX;

      this.initialTouchDistance = Math.abs(touch1X - touch2X);
    } else {
      this.touchHoldTimeout = setTimeout(() => {
        const event = new CustomEvent('touchHold');
        this.eventTarget.dispatchEvent(event);
      }, TOUCH_HOLD_TIME);

      this.touchMouseDownTime = Date.now();
      this.isDragging = true;
      this.dragStartX = this.stage.getPointerPosition()?.x ?? 0;
      this.dragStartY = this.stage.getPointerPosition()?.y ?? 0;

      this.waveformDragStartTime = this.startTime;
      this.waveformDragEndTime = this.endTime;
    }
  }

  private handleClick() {
    if (this.isMinimap) {
      const clickX = this.stage.getPointerPosition()?.x ?? 0;
      const timeToSet = this.xToTime(clickX);
      this.setCurrentPlayTime(timeToSet);
    }

    const event = new CustomEvent('click');
    this.eventTarget.dispatchEvent(event);
  }
  public setStartTime(newStartTime: number) {
    if (newStartTime < 0 || newStartTime > this.soundDuration) return;

    this.startTime = newStartTime;
    this.updateZoomFactor();
    this.updateWaveform();

    const event = new CustomEvent('waveformStartEndTimesChanged');
    this.eventTarget.dispatchEvent(event);
  }

  public setEndTime(newEndTime: number) {
    if (newEndTime < 0 || newEndTime > this.soundDuration) return;
    this.endTime = newEndTime;
    this.updateZoomFactor();
    this.updateWaveform();

    const event = new CustomEvent('waveformStartEndTimesChanged');
    this.eventTarget.dispatchEvent(event);
  }

  public setStartEndTimes(
    startTime: number,
    endTime: number,
    shouldEmit = true,
    updateZoomFactor = true
  ) {
    if (
      this.diplayWaveformChunks.length * (endTime - startTime) <
      this.stage.width() / 2
    ) {
      return;
    }

    this.startTime = startTime;
    this.endTime = endTime;

    if (updateZoomFactor) this.updateZoomFactor();

    this.updateWaveform();

    this.previousStartTime = startTime;
    this.previousEndTime = endTime;

    if (shouldEmit) {
      const event = new CustomEvent('waveformStartEndTimesChanged');
      this.eventTarget.dispatchEvent(event);
    }
  }

  private handleDrag() {
    if (this.isMinimap) return;

    if (!this.wasPlayingOnDragStart && !this.audioElement.paused)
      this.wasPlayingOnDragStart = true;

    const pointerPosX = this.stage.getPointerPosition()?.x ?? 0;
    const pointerPosY = this.stage.getPointerPosition()?.y ?? 0;
    const deltaX = pointerPosX - this.dragStartX;
    const deltaY = pointerPosY - this.dragStartY;

    if (!this.isPlayPositionAlwaysOnCenter) {
      const timeDeltaX = -((deltaX / this.stage.width()) * this.soundDuration);

      const newStartTime =
        timeDeltaX / this.horizontalZoomFactor + this.waveformDragStartTime;
      const newEndTime =
        timeDeltaX / this.horizontalZoomFactor + this.waveformDragEndTime;

      if (newStartTime > 0 && newEndTime < this.soundDuration) {
        this.setStartEndTimes(newStartTime, newEndTime);
      }
    } else if (this.isPlayPositionAlwaysOnCenter) {
      const dragStartXTime = this.xToTime(this.dragStartX);

      const timeDelta = this.xToTime(this.dragStartX + deltaX) - dragStartXTime;

      const timeToSet = this.audioElement.currentTime - timeDelta;
      this.setCurrentPlayTime(timeToSet, true);

      this.centerTimeRangeOnPlayPosition();

      this.dragStartX = pointerPosX;

      if (!this.audioElement.paused) {
        const event = new CustomEvent('waveformDrag');
        this.eventTarget.dispatchEvent(event);
      }
    }
    if (
      (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) &&
      this.touchHoldTimeout
    ) {
      clearTimeout(this.touchHoldTimeout);
    }
  }

  private handleMouseWheel(event: WheelEvent) {
    if (this.isZoomable) {
      if (event.deltaY < 0) {
        this.waveformZoom('in');
      } else {
        this.waveformZoom('out');
      }
    }
  }

  private handleTouchPan(e: KonvaEventObject<TouchEvent>) {
    if (this.isZoomable) {
      const touch1 = e.evt.touches[0];
      const touch2 = e.evt.touches[1];

      const touch1X = touch1.clientX;
      const touch2X = touch2.clientX;

      const deltaX = Math.abs(touch1X - touch2X) - this.initialTouchDistance;

      const timeDeltaX = -((deltaX / this.stage.width()) * this.soundDuration);

      const startTime = this.waveformDragStartTime - timeDeltaX / 2;
      const endTime = this.waveformDragEndTime + timeDeltaX / 2;

      const newStartTime = Math.max(
        this.isPlayPositionAlwaysOnCenter ? startTime : 0,
        startTime
      );
      const newEndTime = Math.min(
        this.isPlayPositionAlwaysOnCenter ? endTime : this.soundDuration,
        this.waveformDragEndTime + timeDeltaX / 2
      );

      this.setStartEndTimes(newStartTime, newEndTime);

      this.oldTimeDeltaX = timeDeltaX;
      if (Math.abs(deltaX) > 5 && this.touchHoldTimeout) {
        clearTimeout(this.touchHoldTimeout);
      }
    }
  }

  private xToTime(xPos: number) {
    return (
      (xPos / this.stage.width()) * (this.endTime - this.startTime) +
      this.startTime
    );
  }

  private timeToX(time: number) {
    return (
      ((time - this.startTime) / (this.endTime - this.startTime)) *
      this.stage.width()
    );
  }

  public waveformZoom(direction: 'in' | 'out', coef = 1.2) {
    if (direction === 'out' && this.horizontalZoomFactor < 1.2) {
      this.setHorizontalZoomFactor(1);
    } else if (this.isPlayPositionAlwaysOnCenter) {
      const playPosition = this.audioElement.currentTime;
      const visibleDuration = this.endTime - this.startTime;

      if (this.displayChunkSize < 1.2 && direction === 'in') {
        this.updateWaveform();
        return;
      }
      let newVisibleDuration;
      if (direction === 'in') {
        newVisibleDuration = visibleDuration / coef;
      } else {
        newVisibleDuration = visibleDuration * coef;
      }

      const visibleStart = playPosition - newVisibleDuration / 2;
      const visibleEnd = playPosition + newVisibleDuration / 2;

      this.setStartEndTimes(visibleStart, visibleEnd, true, true);
      this.updateZoomFactor();
    } else {
      if (direction === 'out' && this.horizontalZoomFactor < 1.2) {
        this.setHorizontalZoomFactor(1);
        return;
      }

      const centerTime = (this.startTime + this.endTime) / 2;
      const timeDelta = (this.endTime - this.startTime) / 2;

      const newStartTime = Math.max(0, centerTime - timeDelta * coef);
      const newEndTime = Math.min(
        this.soundDuration,
        centerTime + timeDelta * coef
      );

      this.setStartEndTimes(newStartTime, newEndTime);
      this.updateZoomFactor();
    }
    //this.updateWaveform();
  }

  private setHorizontalZoomFactor(newZoomFactor: number) {
    if (newZoomFactor === this.horizontalZoomFactor) return;

    this.horizontalZoomFactor = newZoomFactor;
    if (this.horizontalZoomFactor === 1) {
      this.setStartEndTimes(0, this.soundDuration);
    } else {
      const centerTime = (this.startTime + this.endTime) / 2;
      const timeDelta = (this.endTime - this.startTime) / 2;

      const newStartTime = Math.max(
        0,
        centerTime - timeDelta * this.horizontalZoomFactor
      );
      const newEndTime = Math.min(
        this.soundDuration,
        centerTime + timeDelta * this.horizontalZoomFactor
      );
      this.setStartEndTimes(newStartTime, newEndTime);
    }
  }

  private updateZoomFactor() {
    this.horizontalZoomFactor =
      1 / ((this.endTime - this.startTime) / this.soundDuration);
  }

  public setVerticalZoomFactor(newVerticalZoomFactor: number) {
    this.verticalZoomFactor = newVerticalZoomFactor;
    this.updateWaveform();
  }

  public setHeight(newHeight: number) {
    this.stage.height(newHeight);
    this.updateWaveform();
  }

  setPlayedWaveformFillColor(color: string) {
    this.playedLine.fill(color);
    this.updateWaveform();
  }

  setRemainingWaveformFillColor(color: string) {
    this.remainingLine.fill(color);
    this.updateWaveform();
  }

  setPlayedWaveformStrokeColor(color: string) {
    this.playedLine.stroke(color);
    this.updateWaveform();
  }

  setRemainingWaveformStrokeColor(color: string) {
    this.remainingLine.stroke(color);
    this.updateWaveform();
  }

  setPlayedWaveformOpacity(opacity: number) {
    this.playedLine.opacity(opacity);
    this.updateWaveform();
  }

  setRemainingWaveformOpacity(opacity: number) {
    this.remainingLine.opacity(opacity);
    this.updateWaveform();
  }

  getPlayedWaveformFillColor(): string {
    return this.playedLine.fill();
  }

  getRemainingWaveformFillColor(): string {
    return this.remainingLine.fill();
  }

  getPlayedWaveformStrokeColor(): string {
    return this.playedLine.stroke();
  }

  getRemainingWaveformStrokeColor(): string {
    return this.remainingLine.stroke();
  }

  getPlayedWaveformOpacity(): number {
    return this.playedLine.opacity();
  }

  getRemainingWaveformOpacity(): number {
    return this.remainingLine.opacity();
  }

  setInTime(value: number | null) {
    this.inTime = value;
    this.updateWaveform();
  }

  setOutTime(value: number | null) {
    this.outTime = value;
    this.updateWaveform();
  }

  setShowEnveloppe(showEnvelope: boolean) {
    this.showEnveloppeOnWaveform = showEnvelope;
    this.updateWaveform();
  }

  setShowEnveloppePoints(showEnvelopePoints: boolean) {
    this.enveloppePointsLayer.visible(showEnvelopePoints);
  }

  setShowEnveloppeLine(showEnvelopeLine: boolean) {
    this.enveloppeLineLayer.visible(showEnvelopeLine);
  }

  setEnveloppePoints(enveloppePoints: EnveloppePoint[]) {
    this.enveloppePointsLayer.removeChildren();
    this.enveloppeLineLayer.removeChildren();
    this.enveloppePoints = enveloppePoints;

    this.createEnveloppePointsCircles();
    this.createEnveloppesPointsLines();

    this.updateEnveloppePoints();
    this.updateWaveform();
  }

  private createEnveloppePointsCircles() {
    this.enveloppePointsDisplayCircles = [];
    this.enveloppePointsDragCircles = [];
    for (let i = 0; i < this.enveloppePoints.length; i++) {
      const circle = new Konva.Circle({
        radius: this.enveloppePointsDisplayCircleSize,
        fill: this.enveloppePointsDisplayCircleFillColor,
        stroke: this.enveloppePointsDisplayCircleStrokeColor,
        strokeWidth: 1,
      });

      this.enveloppePointsDisplayCircles.push(circle);
      this.enveloppePointsLayer.add(circle);

      const dragCircle = new Konva.Circle({
        radius: this.enveloppePointsDragCircleSize,
        fill: 'transparent',
      });
      this.enveloppePointsDragCircles.push(dragCircle);
      this.enveloppePointsLayer.add(dragCircle);

      dragCircle.draggable(true);
      dragCircle.dragBoundFunc((pos) => {
        return this.getEnveloppeCirculeDragBoundFunc(pos, i);
      });

      dragCircle.on('click tap', () => {
        this.handleEnveloppeCircleClick(dragCircle);
      });

      dragCircle.on('dragmove', () => {
        this.handleEnveloppeCircleDragMove(dragCircle);
      });

      dragCircle.on('dbltap dblclick', () => {
        this.handleEnveloppeCircleDoubleCkick(dragCircle);
      });
    }
  }

  private createEnveloppesPointsLines() {
    this.enveloppePointsLine = [];
    for (let i = 0; i < this.enveloppePointsDisplayCircles.length - 1; i++) {
      const line = new Konva.Line({
        stroke: this.enveloppeLineColor,
        strokeWidth: this.enveloppeLineSize,
      });
      this.enveloppePointsLine.push(line);
      this.enveloppeLineLayer.add(line);
    }
  }

  private getEnveloppeCirculeDragBoundFunc(
    pos: { x: number; y: number },
    i: number
  ) {
    const newY = Math.max(0, Math.min(pos.y, this.stage.height()));
    let newX = pos.x;

    if (i === 0) newX = this.timeToX(0);
    else if (i === this.enveloppePoints.length - 1)
      newX = this.timeToX(this.soundDuration);

    const previousPoint = this.enveloppePoints[i - 1] ?? null;
    if (previousPoint && newX <= this.timeToX(previousPoint.time)) {
      newX = this.timeToX(previousPoint.time) + 1;
    }

    const nextPoint = this.enveloppePoints[i + 1] ?? null;
    if (nextPoint && newX >= this.timeToX(nextPoint.time)) {
      newX = this.timeToX(nextPoint.time) - 1;
    }
    return {
      x: newX,
      y: newY,
    };
  }

  private handleEnveloppeCircleClick(dragCircle: Konva.Circle) {
    const index = this.enveloppePointsDragCircles.indexOf(dragCircle);
    this.lastClickedPointIndex = index;
    this.updateEnveloppePoints();
  }

  private handleEnveloppeCircleDoubleCkick(dragCircle: Konva.Circle) {
    const index = this.enveloppePointsDragCircles.indexOf(dragCircle);

    if (index === 0 || index === this.enveloppePoints.length - 1) return;

    this.enveloppePoints.splice(index, 1);
    this.setEnveloppePoints(this.enveloppePoints);

    const event = new CustomEvent('enveloppePointsChanged');
    this.eventTarget.dispatchEvent(event);
  }

  private handleEnveloppeCircleDragMove(dragCircle: Konva.Circle) {
    let newGainDb = this.envYToGainDb(dragCircle.y());
    const newTime = this.xToTime(dragCircle.x());

    if (newGainDb === Number.NEGATIVE_INFINITY) newGainDb = -100;

    const index = this.enveloppePointsDragCircles.indexOf(dragCircle);
    this.enveloppePoints[index] = {
      time: newTime,
      gainDb: newGainDb,
    };
    this.lastClickedPointIndex = index;

    this.enveloppePoints.sort((a, b) => a.time - b.time);
    this.updateEnveloppePoints();
    this.updateWaveform();
    const event = new CustomEvent('enveloppePointsChanged');
    this.eventTarget.dispatchEvent(event);

    this.drawDraggedEnveloppePointValue(dragCircle, newGainDb);
  }

  private drawDraggedEnveloppePointValue(
    dragCircle: Konva.Circle,
    newGainDb: number
  ) {
    const text = this.enveloppePointsValueText;
    this.enveloppePointsValueLayer.visible(true);
    text.fontSize(20);
    text.text(`${newGainDb.toFixed(1)}dB`);
    text.fill('white');
    text.verticalAlign('middle');

    const textX = this.stage.width() / 2 - text.width() / 2;
    const textY = 2;
    text.x(textX);
    text.y(textY);

    const background = this.enveloppePointsValueTextBackground;
    background.x(textX - 4);
    background.y(textY - 2);
    background.width(text.width() + 8);
    background.height(text.height() + 4);
    background.fill('red');
    background.opacity(0.3);
    /*  background.stroke('black');
    background.strokeWidth(1); */
    background.cornerRadius(5);

    if (this.enveloppeDragTimeoutID !== null) {
      clearTimeout(this.enveloppeDragTimeoutID);
    }
    this.enveloppeDragTimeoutID = setTimeout(() => {
      this.enveloppePointsValueLayer.visible(false);
      this.enveloppeDragTimeoutID = null;
    }, 500);
  }

  private updateEnveloppePoints() {
    for (let i = 0; i < this.enveloppePoints.length; i++) {
      const point = this.enveloppePoints[i];
      const x = this.timeToX(point.time);
      const y = this.envGainDbToY(point.gainDb);

      const circle = this.enveloppePointsDisplayCircles[i];
      circle.x(x);
      circle.y(y);
      const dragCircle = this.enveloppePointsDragCircles[i];
      dragCircle.x(x);
      dragCircle.y(y);
    }

    for (let i = 0; i < this.enveloppePointsDisplayCircles.length - 1; i++) {
      this.enveloppePointsLine[i].points([
        this.enveloppePointsDisplayCircles[i].x(),
        this.enveloppePointsDisplayCircles[i].y(),
        this.enveloppePointsDisplayCircles[i + 1].x(),
        this.enveloppePointsDisplayCircles[i + 1].y(),
      ]);
    }

    if (this.showLastClickedPoint && this.lastClickedPointIndex >= 0) {
      this.updateLastClickedEnveloppePoint();
    }

    //this.updateWaveform();
  }
  private updateLastClickedEnveloppePoint() {
    this.enveloppePointsDisplayCircles.forEach((circle) => {
      circle.fill(this.enveloppePointsDisplayCircleFillColor);
    });
    const lastPoint =
      this.enveloppePointsDisplayCircles[this.lastClickedPointIndex];
    if (lastPoint) {
      lastPoint.fill(this.lastClickedPointColor);
    }
  }

  public getEnveloppeValueAtTime(time: number) {
    const enveloppePoints = this.enveloppePoints;

    if (enveloppePoints.length === 0) return 0;
    if (time <= enveloppePoints[0].time) return enveloppePoints[0].gainDb;
    if (time >= enveloppePoints[enveloppePoints.length - 1].time)
      return enveloppePoints[enveloppePoints.length - 1].gainDb;

    for (let i = 0; i < enveloppePoints.length - 1; i++) {
      const point1 = enveloppePoints[i];
      const point2 = enveloppePoints[i + 1];
      if (time >= point1.time && time <= point2.time) {
        const timeDelta = point2.time - point1.time;
        const gainDbDelta = point2.gainDb - point1.gainDb;
        const timeRatio = (time - point1.time) / timeDelta;
        const gainDb = point1.gainDb + timeRatio * gainDbDelta;
        return gainDb;
      }
    }
    return 0;
  }

  private envGainDbToY(gainDb: number) {
    const height = this.stage.height();
    const middleY = height / 2;

    if (gainDb === 0) return middleY;
    else if (gainDb > 0) {
      return middleY - (gainDb / this.enveloppeMaxGainDb) * middleY;
    } else if (gainDb < 0) {
      const valueFromScale =
        this.enveloppePointsNormRange.logScaleTo0to1(gainDb);
      const y = middleY * (1 + (1 - valueFromScale));
      return y;
    }
    return middleY;
  }

  private envYToGainDb(y: number) {
    const height = this.stage.height();
    const middleY = height / 2;

    if (y === middleY) return 0;
    else if (y < middleY) {
      return ((middleY - y) / middleY) * this.enveloppeMaxGainDb;
    } else if (y > middleY) {
      const valueToScale = 1 - (y - middleY) / middleY;
      return this.enveloppePointsNormRange.logScaleFrom0to1(valueToScale);
    }
    return 0;
  }

  public getEnveloppePoints(): EnveloppePoint[] {
    return this.enveloppePoints;
  }

  cleanUp() {
    this.unregisterEventsListeners();
    this.deregisterMouseEvents();
    this.resizeObserver.unobserve(this.waveformView);
    this.resizeObserver.disconnect();

    this.anim.stop();

    this.stage.off('mousedown touchstart');
    this.stage.off('mouseup touchend');
    this.stage.off('mousemove touchmove');
    this.stage.off('wheel');
    /* this.waveformLayer.destroy();
    this.playedLine.destroy();
    this.remainingLine.destroy();
    this.minimapRangeLayer?.destroy();
    this.minimapRangeRect?.destroy(); */

    //this.stage.destroy();
    this.globalWaveformChunks = new Float32Array(0);
    this.diplayWaveformChunks = new Float32Array(0);
    this.displayChunkSize = 0;
    this.waveformCalculated = false;
    this.waveformLayerBackground.destroy();
    this.remainingLine.closed(true);
    this.waveformBarsRect = [];
    this.enveloppePointsLayer.destroy();
    this.enveloppeLineLayer.destroy();
    this.enveloppePointsDisplayCircles.forEach((circle) => {
      circle.destroy();
    });
    this.enveloppePointsDragCircles.forEach((circle) => {
      circle.destroy();
    });
    this.enveloppePointsLine.forEach((line) => {
      line.destroy();
    });
    this.enveloppePointsValueLayer.destroy();
    this.enveloppePointsValueText.destroy();
    this.enveloppePointsValueTextBackground.destroy();
    this.showLastClickedPoint = false;
    this.lastClickedPointColor = 'yellow';
    this.lastClickedPointIndex = -1;

    this.minimapWaveformReference?.removeEventListener(
      'waveformStartEndTimesChanged',
      () => {
        this.handleMinimapTimesChanged();
      }
    );
    this.minimapWaveformReference = null;
    this.zoomableWaveformReference = null;

    this.hasBeenCleanedUp = true;
  }
}

export interface EnveloppePoint {
  time: number;
  gainDb: number;
}
