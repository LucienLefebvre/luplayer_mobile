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

export function getTrimValueFromLoudness(loudness: number) {
  return Math.round((-23 - loudness) * 10) / 10;
}
