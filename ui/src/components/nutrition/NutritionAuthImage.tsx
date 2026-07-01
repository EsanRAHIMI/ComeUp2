import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buildApiUrl } from '../../api/client';

type Props = {
  path: string;
  token: string;
  alt?: string;
  className?: string;
};

export function NutritionAuthImage({ path, token, alt = '', className }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setFailed(false);
    setSrc(null);

    void (async () => {
      try {
        const response = await fetch(buildApiUrl(path), {
          headers: { authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok || cancelled) {
          if (!cancelled) setFailed(true);
          return;
        }
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return;
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, token, reloadKey]);

  if (loading) {
    return (
      <div className={`nutrition-photo__placeholder ${className ?? ''}`.trim()} aria-hidden>
        <Loader2 className="spin nutrition-photo__loader" size={20} />
      </div>
    );
  }

  if (failed || !src) {
    return (
      <button
        type="button"
        className={`nutrition-photo__placeholder nutrition-photo__placeholder--error ${className ?? ''}`.trim()}
        onClick={() => setReloadKey((value) => value + 1)}
        aria-label="بارگذاری مجدد تصویر"
      >
        <RefreshCw size={18} />
      </button>
    );
  }

  return <img src={src} alt={alt} className={className} />;
}
