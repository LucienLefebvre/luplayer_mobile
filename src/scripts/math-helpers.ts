export function dbToGain(db: number) {
  return Math.exp(db * (Math.log(10.0) / 20.0));
}

export function gainToDb(gain: number) {
  return 20.0 * Math.log10(gain);
}

export function scaleTo0to1(value: number, min: number, max: number) {
  return (value - min) / (max - min);
}

export function scaleFrom0to1(value: number, min: number, max: number) {
  return value * (max - min) + min;
}

export function logScaleTo0to1(
  value: number,
  min: number,
  max: number,
  skew: number
) {
  const scaledValue = Math.pow(skew, (value - min) / (max - min));
  return (scaledValue - 1) / (skew - 1);
}

export function logScaleFrom0to1(
  value: number,
  min: number,
  max: number,
  skew: number
) {
  const unscaledValue = Math.log(value * (skew - 1) + 1) / Math.log(skew);
  return unscaledValue * (max - min) + min;
}

export function logScaleWithinSameRange(
  value: number,
  min: number,
  max: number,
  skew: number
) {
  const scaledValue = Math.pow(skew, (value - min) / (max - min));
  const newScaledValue = (scaledValue - 1) / (skew - 1);
  const range = max - min;
  return newScaledValue * range + min;
}

export function getMMSSfromS(timeInSeconds: number) {
  const seconds = Math.floor(timeInSeconds);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  const minutesString = minutes < 10 ? '' + minutes : minutes;
  if (minutes < 1) {
    return remainingSeconds.toFixed(0) + "''";
  }
  const secondsString =
    Math.floor(remainingSeconds) < 10 && Math.floor(remainingSeconds) > 0
      ? '0' + remainingSeconds.toFixed(0)
      : remainingSeconds.toFixed(0);

  return minutesString + "'" + secondsString + "''";
}

export function getMMSSMSfromMS(timeInMS: number) {
  const seconds = Math.floor(timeInMS / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;
  const minutesString = minutes < 10 ? '' + minutes : minutes;
  const secondsString =
    Math.floor(remainingSeconds) < 10 && Math.floor(remainingSeconds) > 0
      ? '0' + remainingSeconds.toFixed(0)
      : remainingSeconds.toFixed(0);
  const milliseconds = (timeInMS % 10).toFixed(0);
  return minutesString + "'" + secondsString + "''" + milliseconds;
}
