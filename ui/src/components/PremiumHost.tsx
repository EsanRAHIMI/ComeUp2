import { useEffect, useState } from 'react';
import { subscribePaywall } from '../lib/paywallBus';
import { PaywallModal } from './PaywallModal';

/** Mount once under AppProvider to open paywall from GPT/plate entry points. */
export function PremiumHost() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    return subscribePaywall((nextReason) => {
      setReason(nextReason ?? null);
      setOpen(true);
    });
  }, []);

  return <PaywallModal open={open} onClose={() => setOpen(false)} reason={reason} />;
}
