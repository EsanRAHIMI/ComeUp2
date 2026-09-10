import { Camera, ImagePlus, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { nutritionApi } from '../../api';
import { EmptyState } from '../EmptyState';
import { useApp } from '../../hooks/useApp';
import type { MealSlotId, NutritionGeneratedPlate, NutritionPlatePhoto } from '@comeup/domain';
import { useT } from '../../i18n/LocaleProvider';
import { NutritionAuthImage } from './NutritionAuthImage';
import { NutritionMealSlotField } from './NutritionMealSlotField';

type Props = {
  date: string;
};

export function PlatePhotoArchive({ date }: Props) {
  const t = useT();
  const { token, notify } = useApp();
  const [mealSlot, setMealSlot] = useState<MealSlotId>('lunch');
  const [file, setFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<NutritionPlatePhoto[]>([]);
  const [plates, setPlates] = useState<NutritionGeneratedPlate[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadArchive = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [photoResult, plateResult] = await Promise.all([
        nutritionApi.photos(token, date),
        nutritionApi.plates(token, date),
      ]);
      setPhotos(photoResult.photos);
      setPlates(plateResult.plates);
    } catch (error) {
      setPhotos([]);
      setPlates([]);
      setLoadError(error instanceof Error ? error.message : t.nutrition.couldNotLoadArchive);
    } finally {
      setLoading(false);
    }
  }, [token, date, t.nutrition.couldNotLoadArchive]);

  useEffect(() => {
    void loadArchive();
  }, [loadArchive]);

  const mealPhotos = useMemo(
    () => photos.filter((photo) => photo.mealSlot === mealSlot),
    [photos, mealSlot],
  );

  const latestGenerated = useMemo(
    () => plates.find((plate) => plate.mealSlot === mealSlot) ?? null,
    [plates, mealSlot],
  );

  async function upload() {
    if (!token || !file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('date', date);
      form.append('mealSlot', mealSlot);
      const result = await nutritionApi.uploadPhoto(token, form);
      setPhotos((current) => [result.photo, ...current]);
      setFile(null);
      notify(t.nutrition.photoUploaded, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : t.nutrition.uploadFailedShort, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function generate() {
    if (!token) return;
    setGenerating(true);
    try {
      const result = await nutritionApi.generatePlate(token, { date, mealSlot });
      setPlates((current) => [result.plate, ...current.filter((plate) => plate.id !== result.plate.id)]);
      notify(t.nutrition.plateGenerated, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : t.nutrition.generateFailed, 'error');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="nutrition-panel">
      <section className="card">
        <div className="card__head">
          <div>
            <p className="eyebrow">{t.nutrition.archive}</p>
            <h3>{t.nutrition.realPlatePhotos}</h3>
          </div>
          <span className="card__head-icon" aria-hidden>
            <Camera size={20} />
          </span>
        </div>

        <NutritionMealSlotField value={mealSlot} onChange={setMealSlot} />

        <label className="field">
          <span>{t.nutrition.choosePhoto}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!file || uploading}
          onClick={() => void upload()}
        >
          {uploading ? <Loader2 className="spin" size={18} /> : <ImagePlus size={18} />}
          {t.nutrition.uploadPhoto}
        </button>
      </section>

      {loading ? (
        <div className="loading-row">
          <Loader2 className="spin" size={20} />
          <span>{t.nutrition.loadingPhotos}</span>
        </div>
      ) : loadError ? (
        <section className="card nutrition-error-card">
          <p>{loadError}</p>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => void loadArchive()}>
            <RefreshCw size={16} />
            {t.nutrition.retry}
          </button>
        </section>
      ) : mealPhotos.length ? (
        <div className="nutrition-photo-grid">
          {mealPhotos.map((photo) =>
            token ? (
              <NutritionAuthImage
                key={photo.id}
                token={token}
                path={photo.url}
                alt={photo.caption ?? t.nutrition.plateAlt}
                className="nutrition-photo"
              />
            ) : null,
          )}
        </div>
      ) : (
        <EmptyState title={t.nutrition.noPhotosTitle} description={t.nutrition.noPhotosBody} />
      )}

      <section className="card">
        <div className="card__head">
          <div>
            <p className="eyebrow">{t.nutrition.ai}</p>
            <h3>{t.nutrition.hypotheticalPlate}</h3>
          </div>
          <span className="card__head-icon" aria-hidden>
            <Sparkles size={20} />
          </span>
        </div>

        <p className="field__hint nutrition-form__hint">{t.nutrition.generateHint}</p>

        <button
          type="button"
          className="btn btn--ghost btn--block"
          disabled={generating}
          onClick={() => void generate()}
        >
          {generating ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
          {t.nutrition.generateImage}
        </button>

        {latestGenerated && token ? (
          <NutritionAuthImage
            token={token}
            path={latestGenerated.url}
            alt={t.nutrition.generatedPlateAlt}
            className="nutrition-photo nutrition-photo--wide"
          />
        ) : null}
      </section>
    </div>
  );
}
