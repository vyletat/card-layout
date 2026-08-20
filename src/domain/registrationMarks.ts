/** Distance from the paper edge to the centre of a registration target. */
export const REGISTRATION_INSET_MM = 8;
/** Radius of the target's ring; the cross extends slightly past it. */
export const REGISTRATION_RADIUS_MM = 2.5;

export interface RegistrationMark {
  xMm: number;
  yMm: number;
}

/**
 * Corner targets printed identically on both sides of a sheet. Holding the
 * printed sheet against the light, the front and back rings must coincide —
 * any drift is exactly what the calibration offsets correct.
 *
 * Positions are symmetric about both paper axes, so duplex mirroring (either
 * edge) maps the set onto itself and the same coordinates work for both sides.
 */
export function registrationMarkPositions(
  paperWidthMm: number,
  paperHeightMm: number,
  insetMm = REGISTRATION_INSET_MM,
): RegistrationMark[] {
  const left = insetMm;
  const right = paperWidthMm - insetMm;
  const top = insetMm;
  const bottom = paperHeightMm - insetMm;

  return [
    { xMm: left, yMm: top },
    { xMm: right, yMm: top },
    { xMm: left, yMm: bottom },
    { xMm: right, yMm: bottom },
  ];
}
