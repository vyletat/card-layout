import { mirrorPointForDuplex, type DuplexMode } from '../../domain/duplexMapping';
import '../export/PrintView.css';
import './CalibrationSheet.css';

const INSET_MM = 15;
const CROSS_SIZE_MM = 8;

function referencePoints(paperWidthMm: number, paperHeightMm: number) {
  return [
    { label: 'A', xMm: INSET_MM, yMm: INSET_MM },
    { label: 'B', xMm: paperWidthMm - INSET_MM, yMm: INSET_MM },
    { label: 'C', xMm: INSET_MM, yMm: paperHeightMm - INSET_MM },
    { label: 'D', xMm: paperWidthMm - INSET_MM, yMm: paperHeightMm - INSET_MM },
    { label: 'S', xMm: paperWidthMm / 2, yMm: paperHeightMm / 2 },
  ];
}

export function CalibrationSheet({
  paperWidthMm,
  paperHeightMm,
  duplexMode,
}: {
  paperWidthMm: number;
  paperHeightMm: number;
  duplexMode: DuplexMode;
}) {
  const frontPoints = referencePoints(paperWidthMm, paperHeightMm);
  const backPoints = frontPoints.map((p) => ({
    ...p,
    ...mirrorPointForDuplex(p.xMm, p.yMm, paperWidthMm, paperHeightMm, duplexMode),
  }));

  return (
    <>
      <div className="sheet-page calibration-page" style={{ width: `${paperWidthMm}mm`, height: `${paperHeightMm}mm` }}>
        <div className="calibration-label">LÍC</div>
        {frontPoints.map((p) => (
          <Cross key={p.label} xMm={p.xMm} yMm={p.yMm} label={p.label} />
        ))}
      </div>
      <div className="sheet-page calibration-page" style={{ width: `${paperWidthMm}mm`, height: `${paperHeightMm}mm` }}>
        <div className="calibration-label">RUB</div>
        {backPoints.map((p) => (
          <Cross key={p.label} xMm={p.xMm} yMm={p.yMm} label={p.label} />
        ))}
      </div>
    </>
  );
}

function Cross({ xMm, yMm, label }: { xMm: number; yMm: number; label: string }) {
  return (
    <div className="calibration-cross" style={{ left: `${xMm}mm`, top: `${yMm}mm` }}>
      <span className="calibration-cross-h" style={{ width: `${CROSS_SIZE_MM}mm` }} />
      <span className="calibration-cross-v" style={{ height: `${CROSS_SIZE_MM}mm` }} />
      <span className="calibration-cross-label">{label}</span>
    </div>
  );
}
