import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../state/projectStore';
import { Icon } from '../../components/Icon';
import { DEFAULT_PROJECT_SETTINGS } from '../../state/types';

export function CalibrationPanel({ onPrintCalibration }: { onPrintCalibration: () => void }) {
  const { t } = useTranslation();
  const settings = useProjectStore((s) => s.project.settings);
  const updateSettings = useProjectStore((s) => s.updateSettings);
  const unit = settings.unit;

  function numberField(
    label: string,
    value: number,
    suffix: string,
    step: number,
    onChange: (v: number) => void,
  ) {
    return (
      <label className="field">
        <span>{label}</span>
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
        />
        <span className="unit">{suffix}</span>
      </label>
    );
  }

  return (
    <div className="calibration-panel">
      <h2>
        <Icon name="target" size={15} />
        {t('calibration.title')}
      </h2>
      <p className="upload-hint">{t('calibration.hint')}</p>
      <button type="button" onClick={onPrintCalibration}>
        <Icon name="printer" size={15} />
        {t('calibration.printButton')}
      </button>

      {numberField(t('calibration.offsetX'), settings.calibrationOffsetXMm, unit, 0.1, (v) =>
        updateSettings({ calibrationOffsetXMm: v }),
      )}
      {numberField(t('calibration.offsetY'), settings.calibrationOffsetYMm, unit, 0.1, (v) =>
        updateSettings({ calibrationOffsetYMm: v }),
      )}

      <p className="upload-hint">{t('calibration.advancedHint')}</p>
      {numberField(t('calibration.scaleX'), settings.calibrationScaleXPct, '%', 0.1, (v) =>
        updateSettings({ calibrationScaleXPct: v }),
      )}
      {numberField(t('calibration.scaleY'), settings.calibrationScaleYPct, '%', 0.1, (v) =>
        updateSettings({ calibrationScaleYPct: v }),
      )}
      {numberField(t('calibration.rotation'), settings.calibrationRotationDeg, '°', 0.05, (v) =>
        updateSettings({ calibrationRotationDeg: v }),
      )}

      <button
        type="button"
        onClick={() =>
          updateSettings({
            calibrationOffsetXMm: DEFAULT_PROJECT_SETTINGS.calibrationOffsetXMm,
            calibrationOffsetYMm: DEFAULT_PROJECT_SETTINGS.calibrationOffsetYMm,
            calibrationScaleXPct: DEFAULT_PROJECT_SETTINGS.calibrationScaleXPct,
            calibrationScaleYPct: DEFAULT_PROJECT_SETTINGS.calibrationScaleYPct,
            calibrationRotationDeg: DEFAULT_PROJECT_SETTINGS.calibrationRotationDeg,
          })
        }
      >
        {t('calibration.reset')}
      </button>
    </div>
  );
}
