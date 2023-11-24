import Konva from 'konva';
import { SoundModel } from 'src/components/models';
import { dbToGain } from './math-helpers';

export function calculateWaveformChunks(waveform: Float32Array): Float32Array {
  let chunks: Float32Array = new Float32Array(0);
  const samplesPerChunk = 1000;
  const numberOfChunks = Math.ceil(waveform.length / samplesPerChunk);
  for (let i = 0; i < numberOfChunks; i++) {
    const start = i * samplesPerChunk;
    const end = start + samplesPerChunk;
    const currentChunk = waveform.slice(start, end);
    const currentChunkAbsolute = currentChunk.map(Math.abs);
    const max = Math.max(...currentChunkAbsolute);
    chunks = Float32Array.from([...chunks, max]);
  }
  return chunks;
}

export function calculateYValueArrayFromChunks(
  waveformChunks: Float32Array,
  numberOfValues: number
): Float32Array {
  let dataArray = new Float32Array(0);
  const chunkSize = waveformChunks.length / numberOfValues;
  for (let i = 0; i < numberOfValues; i++) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    const currentChunk = waveformChunks.slice(start, end);
    const currentChunkAbsolute = currentChunk.map(Math.abs);
    const max = Math.max(...currentChunkAbsolute);
    dataArray = Float32Array.from([
      ...dataArray,
      max === Number.NEGATIVE_INFINITY ? 0 : max,
    ]);
  }
  console.log(dataArray);
  return dataArray;
}

export function drawWaveform(
  waveformChunks: Float32Array,
  sound: SoundModel,
  stage: Konva.Stage,
  layer: Konva.Layer,
  verticalZoomFactor: number
) {
  if (!sound.waveformCalculated || sound.waveform === null) return;

  const width = stage.width();
  const height = stage.height();
  const ratio = dbToGain(sound.trimGain) * verticalZoomFactor;
  const middleY = height / 2;

  layer.removeChildren();

  const soundProgress =
    sound.audioElement.currentTime / sound.audioElement.duration;
  const progressX = soundProgress * width;

  if (waveformChunks !== null) {
    const playedPoints = [];
    const remainingPoints = [];

    for (let i = 0; i < width; i++) {
      const yValue = middleY + waveformChunks[i] * middleY * ratio;
      if (i < progressX) {
        playedPoints.push(i, yValue);
      } else {
        remainingPoints.push(i, yValue);
      }
    }

    for (let i = width - 1; i > 0; i--) {
      const yValue = middleY - waveformChunks[i] * middleY * ratio;
      if (i < progressX) {
        playedPoints.push(i, yValue);
      } else {
        remainingPoints.push(i, yValue);
      }
    }

    const playedWaveformColor = sound.remainingTime < 5 ? 'red' : 'green';
    const playedLine = new Konva.Line({
      points: playedPoints,
      fill: playedWaveformColor,
      closed: true,
    });

    const remainingWaveformColor = sound.isSelected
      ? 'orange'
      : 'rgb(40, 134, 189)';
    const remainingLine = new Konva.Line({
      points: remainingPoints,
      fill: remainingWaveformColor,
      closed: true,
    });

    layer.add(playedLine);
    layer.add(remainingLine);
    layer.draw();
  }
}
