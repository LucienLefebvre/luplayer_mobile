export function lerpRGBAColor(
  a: [number, number, number, number],
  b: [number, number, number, number],
  amount: number
): string {
  const ar = a[0],
    ag = a[1],
    ab = a[2],
    aa = a[3],
    br = b[0],
    bg = b[1],
    bb = b[2],
    ba = b[3],
    rr = ar + amount * (br - ar),
    rg = ag + amount * (bg - ag),
    rb = ab + amount * (bb - ab),
    ra = aa + amount * (ba - aa);
  return `rgba(${rr}, ${rg}, ${rb}, ${ra})`;
}
