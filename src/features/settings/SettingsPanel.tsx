import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { PAPER_SIZES } from '../../domain/paperSizes';
import { CARD_PRESETS, findMatchingPreset } from '../../domain/cardPresets';
import { fromMm, toMm, type LengthUnit } from '../../domain/units';
import { useProjectStore } from '../../state/projectStore';
import { PROJECT_TEMPLATES } from '../../state/projectTemplates';
import { Icon } from '../../components/Icon';

function NumberField({
  label,
  valueMm,
  unit,
  onChangeMm,
  step = 1,
}: {
  label: string;
  valueMm: number;
  unit: LengthUnit;
  onChangeMm: (mm: number) => void;
  step?: number;
}) {
  const displayValue = fromMm(valueMm, unit);
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={round(displayValue)}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const parsed = parseFloat(e.target.value);
          if (!Number.isNaN(parsed)) onChangeMm(toMm(parsed, unit));
        }}
      />
      <span className="unit">{unit}</span>
    </label>
  );
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function SettingsPanel() {
  const { t } = useTranslation();
  const settings = useProjectStore((s) => s.project.settings);
  const updateSettings = useProjectStore((s) => s.updateSettings);
  const unit = settings.unit;

  const activePreset = findMatchingPreset(settings.cardWidthMm, settings.cardHeightMm);

  return (
    <div className="settings-panel">
      <h2>
        <Icon name="settings" size={15} />
        {t('settings.title')}
      </h2>

      <label className="field">
        <span>{t('settings.template')}</span>
        <select
          value=""
          onChange={(e) => {
            const template = PROJECT_TEMPLATES.find((p) => p.id === e.target.value);
            if (template) updateSettings(template.settings);
          }}
        >
          <option value="">{t('settings.templatePlaceholder')}</option>
          {PROJECT_TEMPLATES.map((p) => (
            <option key={p.id} value={p.id}>
              {t(`settings.templates.${p.nameKey}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>{t('settings.units')}</span>
        <select value={unit} onChange={(e) => updateSettings({ unit: e.target.value as LengthUnit })}>
          <option value="mm">{t('settings.unitMm')}</option>
          <option value="cm">{t('settings.unitCm')}</option>
          <option value="in">{t('settings.unitIn')}</option>
        </select>
      </label>

      <fieldset>
        <legend>{t('settings.paper')}</legend>
        <label className="field">
          <span>{t('settings.format')}</span>
          <select
            value={settings.paperSizeId}
            onChange={(e) => updateSettings({ paperSizeId: e.target.value })}
          >
            {PAPER_SIZES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">{t('settings.custom')}</option>
          </select>
        </label>

        {settings.paperSizeId === 'custom' && (
          <>
            <NumberField
              label={t('settings.customPaperWidth')}
              valueMm={settings.customPaperWidthMm}
              unit={unit}
              onChangeMm={(mm) => updateSettings({ customPaperWidthMm: mm })}
            />
            <NumberField
              label={t('settings.customPaperHeight')}
              valueMm={settings.customPaperHeightMm}
              unit={unit}
              onChangeMm={(mm) => updateSettings({ customPaperHeightMm: mm })}
            />
          </>
        )}

        <label className="field">
          <span>{t('settings.orientation')}</span>
          <select
            value={settings.orientation}
            onChange={(e) => updateSettings({ orientation: e.target.value as 'portrait' | 'landscape' })}
          >
            <option value="portrait">{t('settings.portrait')}</option>
            <option value="landscape">{t('settings.landscape')}</option>
          </select>
        </label>
      </fieldset>

      <fieldset>
        <legend>{t('settings.card')}</legend>
        <label className="field">
          <span>{t('settings.cardSizePreset')}</span>
          <select
            value={activePreset?.id ?? 'custom'}
            onChange={(e) => {
              const preset = CARD_PRESETS.find((p) => p.id === e.target.value);
              if (preset) updateSettings({ cardWidthMm: preset.widthMm, cardHeightMm: preset.heightMm });
            }}
          >
            {CARD_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {t(`settings.cardPresets.${p.nameKey}`)} ({p.widthMm} × {p.heightMm} mm)
              </option>
            ))}
            <option value="custom">{t('settings.cardSizeCustom')}</option>
          </select>
        </label>
        <NumberField
          label={t('settings.cardWidth')}
          valueMm={settings.cardWidthMm}
          unit={unit}
          onChangeMm={(mm) => updateSettings({ cardWidthMm: mm })}
        />
        <NumberField
          label={t('settings.cardHeight')}
          valueMm={settings.cardHeightMm}
          unit={unit}
          onChangeMm={(mm) => updateSettings({ cardHeightMm: mm })}
        />
        <NumberField
          label={t('settings.cornerRadius')}
          valueMm={settings.cornerRadiusMm}
          unit={unit}
          onChangeMm={(mm) => updateSettings({ cornerRadiusMm: Math.max(0, mm) })}
        />
      </fieldset>

      <fieldset>
        <legend>{t('settings.bleedGroup')}</legend>
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={settings.bleedEnabled}
            onChange={(e) => updateSettings({ bleedEnabled: e.target.checked })}
          />
          <span>{t('settings.bleedEnable')}</span>
        </label>
        {settings.bleedEnabled && (
          <NumberField
            label={t('settings.bleedLabel')}
            valueMm={settings.bleedMm}
            unit={unit}
            onChangeMm={(mm) => updateSettings({ bleedMm: Math.max(0, mm) })}
          />
        )}
        <NumberField
          label={t('settings.gutter')}
          valueMm={settings.gutterMm}
          unit={unit}
          onChangeMm={(mm) => updateSettings({ gutterMm: Math.max(0, mm) })}
        />
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={settings.safeMarginEnabled}
            onChange={(e) => updateSettings({ safeMarginEnabled: e.target.checked })}
          />
          <span>{t('settings.safeMargin')}</span>
        </label>
        {settings.safeMarginEnabled && (
          <NumberField
            label={t('settings.safeMarginSize')}
            valueMm={settings.safeMarginMm}
            unit={unit}
            onChangeMm={(mm) => updateSettings({ safeMarginMm: Math.max(0, mm) })}
          />
        )}
      </fieldset>

      <fieldset>
        <legend>{t('settings.marksGroup')}</legend>
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={settings.cropMarksEnabled}
            onChange={(e) => updateSettings({ cropMarksEnabled: e.target.checked })}
          />
          <span>{t('settings.cropMarks')}</span>
        </label>
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={settings.registrationMarksEnabled}
            onChange={(e) => updateSettings({ registrationMarksEnabled: e.target.checked })}
          />
          <span>{t('settings.registrationMarks')}</span>
        </label>
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={settings.cardNumbersEnabled}
            onChange={(e) => updateSettings({ cardNumbersEnabled: e.target.checked })}
          />
          <span>{t('settings.cardNumbers')}</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>{t('settings.duplexGroup')}</legend>
        <label className="field">
          <span>{t('settings.duplexMode')}</span>
          <select
            value={settings.duplexMode}
            onChange={(e) => updateSettings({ duplexMode: e.target.value as 'short-edge' | 'long-edge' })}
          >
            <option value="short-edge">{t('settings.shortEdge')}</option>
            <option value="long-edge">{t('settings.longEdge')}</option>
          </select>
        </label>
      </fieldset>
    </div>
  );
}
