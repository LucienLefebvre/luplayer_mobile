import { Ref } from 'vue';
import Konva from 'konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { debounce } from 'quasar';
import { RGB } from 'konva/lib/filters/RGB';

const SAMPLES_PER_CHUNK = 100;
const NUMBER_OF_PIXELS_PER_LINE = 1;
const TOUCH_MOUSE_CLICK_TIME = 200;
const TOUCH_HOLD_TIME = 500;
const FRAME_RATE = 25;

export class Waveform {
  private waveformView: Ref<HTMLDivElement>;
  private audioElement: HTMLAudioElement;

  public eventTarget = new EventTarget();

  private stage: Konva.Stage;
  private waveformLayer: Konva.Layer;

  private globalWaveformChunks: Float32Array;
  private waveformCalculated: boolean;
  private diplayWaveformChunks: Float32Array;
  private displayChunkSize: number;

  private verticalZoomFactor: number;
  private horizontalZoomFactor: number;

  private soundDuration: number;
  private startTime: number;
  private endTime: number;

  private waveformShouldBeRedrawn: boolean;

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

  public strokeWaveform: boolean;
  public fillWaveform: boolean;
  public playedWaveformOpacity: number;
  public remainingWaveformOpacity: number;
  private playedWaveformFillColor: string;
  private remainingWaveformFillColor: string;
  private playedWaveformStrokeColor: string;
  private remainingWaveformStrokeColor: string;
  private minimapRangeRectangleFillColor: string;
  private minimapRangeRectangleOpacity: number;
  private minimapRangeRectangleCornerRadius: number;

  private isMinimap: boolean;
  private minimapWaveformReference: Waveform | null;
  private minimapRangeLayer: Konva.Layer | null;
  private minimapRangeRect: Konva.Rect | null;

  constructor(
    waveformView: Ref<HTMLDivElement>,
    audioElement: HTMLAudioElement,
    height = 100,
    isMinimap = false,
    minimapWaveformReference = null as Waveform | null
  ) {
    this.eventTarget = new EventTarget();

    this.waveformView = waveformView;
    this.audioElement = audioElement;

    this.stage = new Konva.Stage({
      container: this.waveformView.value,
      width: this.waveformView.value.clientWidth,
      height: height,
    });

    this.globalWaveformChunks = new Float32Array(0);
    this.diplayWaveformChunks = new Float32Array(0);
    this.displayChunkSize = 0;
    this.waveformCalculated = false;
    this.waveformShouldBeRedrawn = false;

    this.waveformLayer = new Konva.Layer();
    this.stage.add(this.waveformLayer);

    this.soundDuration = audioElement.duration;
    this.startTime = 0;
    this.endTime = this.soundDuration;
    this.horizontalZoomFactor = 1;
    this.verticalZoomFactor = 1;

    this.isMinimap = isMinimap;
    this.minimapWaveformReference = minimapWaveformReference;

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

    this.strokeWaveform = false;
    this.fillWaveform = true;
    this.playedWaveformFillColor = 'green';
    this.remainingWaveformFillColor = 'orange';
    this.playedWaveformStrokeColor = 'lightgreen';
    this.remainingWaveformStrokeColor = 'lightorange';
    this.playedWaveformOpacity = 1;
    this.remainingWaveformOpacity = 1;

    this.minimapRangeLayer = null;
    this.minimapRangeRect = null;
    this.minimapRangeRectangleFillColor = 'grey';
    this.minimapRangeRectangleOpacity = 0.3;
    this.minimapRangeRectangleCornerRadius = 10;

    if (isMinimap) this.initMinimap();

    this.registerEventsListeners();
    this.registerMouseEvents();
    this.initializeResizeObserver();

    this.launchAnimation();
  }

  public launchAnimation() {
    const anim = new Konva.Animation((frame) => {
      this.drawWaveform();
    }, this.waveformLayer);

    anim.start();
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

  private registerEventsListeners() {
    this.audioElement.addEventListener('play', () => {
      this.waveformShouldBeRedrawn = true;
    });
  }

  private registerMouseEvents() {
    this.stage?.on('mousedown touchstart', (e) => {
      const debounceClick = debounce(
        () => {
          console.log('click');
          this.handleMouseTouchStart(e);
        },
        10,
        true
      );

      debounceClick();
    });

    this.stage?.on('mouseup touchend', (e) => {
      clearTimeout(this.touchHoldTimeout!);
      if (Date.now() - this.touchMouseDownTime < TOUCH_MOUSE_CLICK_TIME) {
        const event = new CustomEvent('click');
        this.eventTarget.dispatchEvent(event);
      }
      this.isDragging = false;
    });

    this.stage?.on('mousemove touchmove', (e) => {
      if (e.evt.touches && e.evt.touches.length > 1) {
        this.handleTouchPan(e);
      } else if (this.isDragging) {
        this.handleDrag();
      }
    });

    this.stage?.on('wheel', (e) => {
      this.handleMouseWheel(e.evt);
    });

    if (this.isMinimap && this.minimapWaveformReference !== null) {
      this.minimapWaveformReference.addEventListener(
        'waveformStartEndTimesChanged',
        () => {
          this.drawMinimapRange();
        }
      );
    }
  }

  public async calculateWaveformChunks(): Promise<Float32Array> {
    const chunks: number[] = [];
    try {
      this.audioElement.baseURI;
      const buffer = await fetch(this.audioElement.src).then((response) =>
        response.arrayBuffer()
      );
      const audioBuffer = await new AudioContext().decodeAudioData(buffer);

      const channelData = audioBuffer.getChannelData(0);

      const numberOfChunks = Math.ceil(channelData.length / SAMPLES_PER_CHUNK);
      for (let i = 0; i < numberOfChunks; i++) {
        const start = i * SAMPLES_PER_CHUNK;
        let max = Number.NEGATIVE_INFINITY;
        for (let j = 0; j < SAMPLES_PER_CHUNK; j++) {
          if (start + j >= channelData.length) break;
          const sampleValue = Math.abs(channelData[start + j]);
          if (sampleValue > max) max = sampleValue;
        }
        chunks.push(max);
      }
    } catch (error) {
      console.error('Error:', error);
    }

    this.globalWaveformChunks = new Float32Array(chunks);
    this.waveformCalculated = true;

    this.waveformShouldBeRedrawn = true;

    const event = new CustomEvent('waveformChunksCalculated');
    this.eventTarget.dispatchEvent(event);

    this.calculateYValueArrayFromChunks();
    return this.globalWaveformChunks;
  }

  public setWaveformChunks(waveformChunks: Float32Array) {
    this.globalWaveformChunks = waveformChunks;

    this.waveformCalculated = true;
    this.waveformShouldBeRedrawn = true;

    this.calculateYValueArrayFromChunks();
  }

  private async calculateYValueArrayFromChunks() {
    const startTime = performance.now();
    const dataArray: number[] = [];

    const clippedWaveformChunks = this.globalWaveformChunks.slice(
      this.globalWaveformChunks.length * (this.startTime / this.soundDuration),
      this.globalWaveformChunks.length * (this.endTime / this.soundDuration)
    );

    this.displayChunkSize = clippedWaveformChunks.length / this.stage.width();

    let lastMax = 0;
    for (let i = 0; i < this.stage.width(); i++) {
      const start = i * this.displayChunkSize;
      const end = start + this.displayChunkSize;
      const currentChunk = clippedWaveformChunks.slice(start, end);
      let max = Math.max(...currentChunk);
      if (max === Number.NEGATIVE_INFINITY) max = lastMax;
      dataArray.push(max);
      lastMax = max;
    }

    this.diplayWaveformChunks = new Float32Array(dataArray);

    const endTime = performance.now();
    const duration = endTime - startTime;
    //console.log('calculateYValueArrayFromChunks duration: ', duration);
  }

  private drawWaveform() {
    if (
      !this.waveformCalculated ||
      this.stage.height() < 11 ||
      !this.waveformShouldBeRedrawn ||
      this.diplayWaveformChunks === null
    ) {
      return;
    }

    const frameRedrawStartTime = performance.now();
    const width = this.stage.width();
    const height = this.stage.height();
    const ratio = this.verticalZoomFactor;
    const middleY = height / 2;

    this.waveformLayer.removeChildren();

    const soundProgress =
      (this.audioElement.currentTime - this.startTime) /
      (this.endTime - this.startTime);

    const progressX = Math.floor(soundProgress * width);

    const playedPoints = [];
    const remainingPoints = [];

    for (let i = 0; i < width; i += NUMBER_OF_PIXELS_PER_LINE) {
      const yValue = Math.floor(
        middleY + this.diplayWaveformChunks[i] * middleY * ratio
      );

      if (i < progressX) {
        playedPoints.push(i, Number.isNaN(yValue) ? middleY : yValue);
      } else {
        remainingPoints.push(i, Number.isNaN(yValue) ? middleY : yValue);
      }
    }

    for (let i = width - 1; i > 0; i -= NUMBER_OF_PIXELS_PER_LINE) {
      const yValue = Math.floor(
        middleY - this.diplayWaveformChunks[i] * middleY * ratio
      );
      if (i < progressX) {
        playedPoints.push(i, Number.isNaN(yValue) ? middleY : yValue);
      } else {
        remainingPoints.push(i, Number.isNaN(yValue) ? middleY : yValue);
      }
    }

    const playedLine = new Konva.Line({
      points: playedPoints,
      fill: this.fillWaveform ? this.playedWaveformFillColor : undefined,
      stroke: this.strokeWaveform ? this.playedWaveformStrokeColor : undefined,
      closed: true,
      opacity: this.playedWaveformOpacity,
    });

    const remainingLine = new Konva.Line({
      points: remainingPoints,
      fill: this.fillWaveform ? this.remainingWaveformFillColor : undefined,
      stroke: this.strokeWaveform
        ? this.remainingWaveformStrokeColor
        : undefined,
      closed: true,
      opacity: this.remainingWaveformOpacity,
    });

    this.waveformLayer.add(playedLine);
    this.waveformLayer.add(remainingLine);

    /*  if (this.isMinimap && this.minimapWaveformReference !== null) {
      this.drawMinimapRange(this.layer);
    }
 */
    this.waveformLayer.draw();

    if (this.audioElement.paused) {
      this.waveformShouldBeRedrawn = false;
    }
    const frameRedrawEndTime = performance.now();
    const frameRedrawDuration = frameRedrawEndTime - frameRedrawStartTime;
    //console.log('frame redraw duration: ', frameRedrawDuration);
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
      const newX = Math.max(
        0,
        Math.min(pos.x, this.stage.width() - this.minimapRangeRect!.width())
      );
      return {
        x: newX,
        y: newY,
      };
    });

    this.minimapRangeRect.on('dragmove', () => {
      const newStartTime =
        (this.minimapRangeRect!.x() / this.stage.width()) * this.soundDuration;
      const newEndTime =
        ((this.minimapRangeRect!.x() + this.minimapRangeRect!.width()) /
          this.stage.width()) *
        this.soundDuration;
      console.log(newStartTime, newEndTime);
      this.minimapWaveformReference!.setStartEndTimes(
        newStartTime,
        newEndTime,
        false
      );
    });

    this.minimapRangeLayer.add(this.minimapRangeRect);
    this.stage.add(this.minimapRangeLayer);

    this.drawMinimapRange();
  }

  private drawMinimapRange() {
    const width = this.stage.width();
    const height = this.stage.height();

    const rangeStartTime = this.minimapWaveformReference!.startTime;
    const rangeEndTime = this.minimapWaveformReference!.endTime;

    const rectStartX = Math.floor(
      (rangeStartTime / this.soundDuration) * width
    );
    const recWidth = Math.floor(
      ((rangeEndTime - rangeStartTime) / this.soundDuration) * width
    );

    this.minimapRangeRect!.x(rectStartX);
    this.minimapRangeRect!.y(0);
    this.minimapRangeRect!.width(recWidth);
    this.minimapRangeRect!.height(height);

    this.minimapRangeLayer!.draw();
  }

  setMinimapRangeRectangleFillColor(color: string) {
    this.minimapRangeRect!.fill(color);
    this.drawMinimapRange();
  }

  setMinimapRangeRectangleOpacity(opacity: number) {
    this.minimapRangeRect!.opacity(opacity);
    this.drawMinimapRange();
  }

  setMinimapRangeRectangleCornerRadius(cornerRadius: number) {
    this.minimapRangeRect!.cornerRadius(cornerRadius);
    this.drawMinimapRange();
  }

  public updateWaveform() {
    this.calculateYValueArrayFromChunks().then(() => {
      this.waveformShouldBeRedrawn = true;
    });
  }

  private initializeResizeObserver() {
    const handleResized = debounce(() => {
      this.stage.width(this.waveformView.value.clientWidth);
      this.updateWaveform();
    }, 100);

    const resizeObserver = new ResizeObserver(handleResized);
    resizeObserver.observe(this.waveformView.value);
  }

  private handleMouseTouchStart(e: KonvaEventObject<any>) {
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
      this.dragStartX = this.stage!.getPointerPosition()?.x ?? 0;
      this.dragStartY = this.stage!.getPointerPosition()?.y ?? 0;

      this.waveformDragStartTime = this.startTime;
      this.waveformDragEndTime = this.endTime;
    }
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
    shouldEmit = true
  ) {
    if (startTime < 0 || endTime > this.soundDuration) return;

    this.startTime = startTime;
    this.endTime = endTime;
    this.updateZoomFactor();
    this.updateWaveform();

    if (shouldEmit) {
      const event = new CustomEvent('waveformStartEndTimesChanged');
      this.eventTarget.dispatchEvent(event);
    }
  }

  private handleDrag() {
    const pointerPosX = this.stage!.getPointerPosition()?.x ?? 0;
    const pointerPosY = this.stage!.getPointerPosition()?.y ?? 0;
    const deltaX = pointerPosX - this.dragStartX;
    const deltaY = pointerPosY - this.dragStartY;

    const timeDeltaX = -((deltaX! / this.stage!.width()) * this.soundDuration);
    const newStartTime =
      timeDeltaX / this.horizontalZoomFactor + this.waveformDragStartTime;
    const newEndTime =
      timeDeltaX / this.horizontalZoomFactor + this.waveformDragEndTime;

    if (newStartTime >= 0 && newEndTime <= this.soundDuration) {
      this.setStartEndTimes(newStartTime, newEndTime);
    }

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      clearTimeout(this.touchHoldTimeout!);
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

  private handleTouchPan(e: KonvaEventObject<any>) {
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    const touch1X = touch1.clientX;
    const touch2X = touch2.clientX;

    const deltaX = Math.abs(touch1X - touch2X) - this.initialTouchDistance;

    const timeDeltaX = -((deltaX! / this.stage!.width()) * this.soundDuration);

    const zoomDirection = this.oldTimeDeltaX - timeDeltaX > 0 ? 'in' : 'out';
    if (zoomDirection === 'in' && this.displayChunkSize < 0.1) return;

    const newStartTime = Math.max(
      0,
      this.waveformDragStartTime - timeDeltaX / 2
    );
    const newEndTime = Math.min(
      this.soundDuration,
      this.waveformDragEndTime + timeDeltaX / 2
    );

    this.setStartEndTimes(newStartTime, newEndTime);

    this.oldTimeDeltaX = timeDeltaX;
    if (Math.abs(deltaX) > 5) {
      clearTimeout(this.touchHoldTimeout!);
    }
  }

  private xToTime(xPos: number) {
    return (xPos / this.stage.width()) * this.soundDuration;
  }

  private waveformZoom(direction: 'in' | 'out', coef = 1.2) {
    if (direction === 'out' && this.horizontalZoomFactor < 1.2) {
      this.setZoomFactor(1);
      return;
    }

    const centerTime = (this.startTime + this.endTime) / 2;
    const timeDelta = (this.endTime - this.startTime) / 2;

    coef = direction === 'in' ? 1 / coef : coef;
    const newStartTime = Math.max(0, centerTime - timeDelta * coef);
    const newEndTime = Math.min(
      this.soundDuration,
      centerTime + timeDelta * coef
    );

    this.setStartEndTimes(newStartTime, newEndTime);

    this.updateZoomFactor();
    this.updateWaveform();
  }

  private setZoomFactor(newZoomFactor: number) {
    if (newZoomFactor === this.horizontalZoomFactor) return;
    const oldZoomFactor = this.horizontalZoomFactor;
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
    this.playedWaveformFillColor = color;
    this.updateWaveform();
  }

  setRemainingWaveformFillColor(color: string) {
    this.remainingWaveformFillColor = color;
    this.updateWaveform();
  }

  setPlayedWaveformStrokeColor(color: string) {
    this.playedWaveformStrokeColor = color;
    this.updateWaveform();
  }

  setRemainingWaveformStrokeColor(color: string) {
    this.remainingWaveformStrokeColor = color;
    this.updateWaveform();
  }

  setPlayedWaveformOpacity(opacity: number) {
    this.playedWaveformOpacity = opacity;
    this.updateWaveform();
  }

  setRemainingWaveformOpacity(opacity: number) {
    this.remainingWaveformOpacity = opacity;
    this.updateWaveform();
  }
}
