import { Crown, Loader2, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, billingApi } from '../api';
import { useApp } from '../hooks/useApp';
import { useT } from '../i18n/LocaleProvider';
import {
  getProducts,
  isNativeIapPlatform,
  manageSubscriptions,
  purchase,
  restore,
  type IapProduct,
  type PremiumProductId,
  PREMIUM_PRODUCT_IDS,
} from '../lib/iap';

type Props = {
  open: boolean;
  onClose: () => void;
  reason?: string | null;
};

export function PaywallModal({ open, onClose, reason }: Props) {
  const t = useT();
  const { token, user, refreshUser, notify } = useApp();
  const [products, setProducts] = useState<IapProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const native = isNativeIapPlatform();

  useEffect(() => {
    if (!open || !native) return;
    let cancelled = false;
    setLoadingProducts(true);
    getProducts()
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch((error) => {
        if (!cancelled) {
          notify(error instanceof Error ? error.message : t.premium.loadProductsFailed, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, native, notify, t.premium.loadProductsFailed]);

  if (!open) return null;

  const isPremium = Boolean(user?.isPremium);

  async function syncWithBackend(result: {
    productId: string;
    transactionId: string;
    signedTransactionInfo?: string;
  }) {
    if (!token) throw new Error(t.premium.signInRequired);
    const body = result.signedTransactionInfo
      ? { signedTransactionInfo: result.signedTransactionInfo, productId: result.productId }
      : { transactionId: result.transactionId, productId: result.productId };
    await billingApi.verifyApple(token, body);
    await refreshUser();
  }

  async function onPurchase(productId: PremiumProductId) {
    if (!native) {
      notify(t.premium.iosOnly, 'info');
      return;
    }
    setBusy(productId);
    try {
      const result = await purchase(productId);
      await syncWithBackend(result);
      notify(t.premium.purchaseSuccess, 'success');
      onClose();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t.premium.purchaseFailed;
      // User cancelled StoreKit sheet — keep quiet-ish
      if (/cancel/i.test(message)) {
        notify(t.premium.purchaseCancelled, 'info');
      } else {
        notify(message, 'error');
      }
    } finally {
      setBusy(null);
    }
  }

  async function onRestore() {
    if (!native) {
      notify(t.premium.iosOnly, 'info');
      return;
    }
    setBusy('restore');
    try {
      const result = await restore();
      if (!result) {
        notify(t.premium.nothingToRestore, 'info');
        return;
      }
      await syncWithBackend(result);
      notify(t.premium.restoreSuccess, 'success');
      onClose();
    } catch (error) {
      notify(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : t.premium.restoreFailed,
        'error',
      );
    } finally {
      setBusy(null);
    }
  }

  function priceFor(id: PremiumProductId, fallback: string) {
    return products.find((p) => p.id === id)?.priceString ?? fallback;
  }

  function titleFor(id: PremiumProductId, fallback: string) {
    return products.find((p) => p.id === id)?.title ?? fallback;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-label={t.premium.aria}>
      <div className="modal-card">
        <div className="modal-card__head">
          <div>
            <p className="eyebrow">{t.premium.eyebrow}</p>
            <h2>{t.premium.title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}>
            <X size={18} />
          </button>
        </div>

        {reason ? <p className="modal-card__intro">{reason}</p> : null}

        {isPremium ? (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <p className="eyebrow">{t.premium.statusActive}</p>
            <p>
              {user?.subscriptionProductId
                ? t.premium.activeProduct(user.subscriptionProductId)
                : t.premium.youHavePremium}
            </p>
            {user?.subscriptionExpiresAt ? (
              <small className="ltr-field">{t.premium.renewsOrExpires(user.subscriptionExpiresAt)}</small>
            ) : null}
            {native ? (
              <button
                type="button"
                className="btn btn--ghost btn--block"
                style={{ marginTop: '0.75rem' }}
                onClick={() => void manageSubscriptions()}
              >
                {t.premium.manageInApple}
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="system-list" style={{ marginBottom: '1rem' }}>
              <li>{t.premium.benefitGpt}</li>
              <li>{t.premium.benefitPlate}</li>
              <li>{t.premium.benefitKeepFree}</li>
            </ul>

            {!native ? (
              <p className="field__hint" style={{ marginBottom: '1rem' }}>
                {t.premium.webHint}
              </p>
            ) : null}

            {loadingProducts && native ? (
              <p className="field__hint">
                <Loader2 size={14} className="spin" /> {t.premium.loadingPrices}
              </p>
            ) : null}

            <div className="modal-card__actions" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              {PREMIUM_PRODUCT_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="btn btn--primary btn--block"
                  disabled={Boolean(busy) || !native}
                  onClick={() => void onPurchase(id)}
                >
                  {busy === id ? <Loader2 size={16} className="spin" /> : <Crown size={16} />}
                  {titleFor(id, id === 'comeup_premium_monthly' ? t.premium.monthly : t.premium.yearly)}
                  {' · '}
                  {priceFor(
                    id,
                    id === 'comeup_premium_monthly' ? t.premium.monthlyPriceFallback : t.premium.yearlyPriceFallback,
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {native ? (
          <button
            type="button"
            className="btn btn--ghost btn--block"
            style={{ marginTop: '0.75rem' }}
            disabled={Boolean(busy)}
            onClick={() => void onRestore()}
          >
            {busy === 'restore' ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            {t.premium.restore}
          </button>
        ) : null}

        <p className="field__hint" style={{ marginTop: '1rem' }}>
          {t.premium.legal}
        </p>
      </div>
    </div>
  );
}
