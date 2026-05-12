import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  CheckCircle2,
  Clipboard,
  Clock3,
  Code2,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  RefreshCcw,
  Sparkles,
  Trash2,
  Wallet,
  XCircle,
} from 'lucide-react';
import './styles.css';

const API_KEY_STORAGE = 'qeex_api_key';
const ACTIVATIONS_STORAGE = 'qeex_github_activations';
const LEGACY_ACTIVATION_STORAGE = 'qeex_github_activation';
const SITE = 'github.com';
const MAILBOX_DOMAIN = 'yandex.com';
const ACTIVATION_SECONDS = 20 * 60;
const CANCEL_UNLOCK_SECONDS = 4 * 60;
const POLL_INTERVAL_MS = 1000;

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [hasStoredKeyOnLoad] = useState(() => Boolean(localStorage.getItem(API_KEY_STORAGE)?.trim()));
  const [balance, setBalance] = useState(null);
  const [activations, setActivations] = useState(() => loadStoredActivations());
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [cancellingIds, setCancellingIds] = useState(() => new Set());
  const [isPolling, setIsPolling] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pollRef = useRef(null);
  const didAutoRefreshRef = useRef(false);

  const hasKey = apiKey.trim().length > 0;

  useEffect(() => {
    localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
  }, [apiKey]);

  useEffect(() => {
    if (activations.length > 0) {
      localStorage.setItem(ACTIVATIONS_STORAGE, JSON.stringify(activations));
    } else {
      localStorage.removeItem(ACTIVATIONS_STORAGE);
    }
    localStorage.removeItem(LEGACY_ACTIVATION_STORAGE);
  }, [activations]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const callQeex = useCallback(
    async (method, params = {}) => {
      if (!apiKey.trim()) {
        throw new Error('Enter your Qeex API key first.');
      }

      const url = new URL(`/api/qeex/${method}`, window.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, value);
        }
      });

      const response = await fetch(url.toString(), {
        headers: {
          'X-Qeex-Key': apiKey.trim(),
          Accept: 'application/json',
        },
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error('Unexpected response from the API proxy.');
      }

      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || 'Qeex request failed.');
      }

      return payload.result;
    },
    [apiKey],
  );

  const refreshBalance = useCallback(async () => {
    setError('');
    setIsBalanceLoading(true);

    try {
      const result = await callQeex('accountBalance');
      setBalance(Number(result.balance));
    } catch (caught) {
      setError(caught.message);
    } finally {
      setIsBalanceLoading(false);
    }
  }, [callQeex]);

  useEffect(() => {
    if (!hasStoredKeyOnLoad || didAutoRefreshRef.current || !hasKey) {
      return;
    }

    didAutoRefreshRef.current = true;
    refreshBalance();
  }, [hasKey, hasStoredKeyOnLoad, refreshBalance]);

  const updateActivation = useCallback((id, changes) => {
    setActivations((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }, []);

  const removeActivation = useCallback((id) => {
    setActivations((current) => current.filter((item) => item.id !== id));
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollCodes = useCallback(async () => {
    const waitingActivations = activations.filter((item) => {
      const expired = getSecondsLeft(item, Date.now()) <= 0;
      return !item.received && !expired;
    });

    if (waitingActivations.length === 0) {
      stopPolling();
      return;
    }

    try {
      const results = await Promise.allSettled(
        waitingActivations.map(async (item) => ({
          id: item.id,
          result: await callQeex('emailCode', { id: item.id }),
        })),
      );

      let receivedAny = false;

      results.forEach((item) => {
        if (item.status === 'fulfilled' && item.value.result?.received) {
          updateActivation(item.value.id, {
            code: item.value.result.code || '',
            received: true,
            receivedAt: Date.now(),
          });
          receivedAny = true;
        } else if (item.status === 'rejected') {
          setError(item.reason?.message || 'Qeex request failed.');
        }
      });

      if (receivedAny) {
        await refreshBalance();
      }
    } catch (caught) {
      setError(caught.message);
      stopPolling();
    }
  }, [activations, callQeex, refreshBalance, stopPolling, updateActivation]);

  const startPolling = useCallback(() => {
    const hasWaitingActivation = activations.some((item) => !item.received && getSecondsLeft(item, Date.now()) > 0);

    if (!hasWaitingActivation || pollRef.current) {
      return;
    }

    setIsPolling(true);
    pollCodes();
    pollRef.current = window.setInterval(pollCodes, POLL_INTERVAL_MS);
  }, [activations, pollCodes]);

  useEffect(() => {
    if (activations.length > 0 && hasKey) {
      startPolling();
    }

    return stopPolling;
  }, [activations.length, hasKey, startPolling, stopPolling]);

  useEffect(() => {
    const hasWaitingActivation = activations.some((item) => !item.received && getSecondsLeft(item, Date.now()) > 0);

    if (!hasWaitingActivation) {
      stopPolling();
    }
  }, [activations, now, stopPolling]);

  const orderEmail = async () => {
    setError('');
    setIsOrdering(true);

    try {
      const result = await callQeex('emailGet', {
        site: SITE,
        domain: MAILBOX_DOMAIN,
      });

      setActivations((current) => [
        {
          id: result.id,
          email: result.email,
          site: result.site || SITE,
          domain: MAILBOX_DOMAIN,
          code: '',
          received: false,
          createdAt: Date.now(),
        },
        ...current,
      ]);
      await refreshBalance();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setIsOrdering(false);
    }
  };

  const cancelActivation = async (activation) => {
    if (!canCancelActivation(activation, now, cancellingIds)) {
      return;
    }

    const confirmed = window.confirm(`Cancel ${activation.email} and request a refund?`);
    if (!confirmed) {
      return;
    }

    setError('');
    setCancellingIds((current) => new Set(current).add(activation.id));

    try {
      await callQeex('emailCancel', { id: activation.id });
      removeActivation(activation.id);
      await refreshBalance();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setCancellingIds((current) => {
        const next = new Set(current);
        next.delete(activation.id);
        return next;
      });
    }
  };

  const clearKey = () => {
    setApiKey('');
    setBalance(null);
    setError('');
    stopPolling();
  };

  const resetActivation = () => {
    setActivations([]);
  };

  const removeActivationCard = (id) => {
    removeActivation(id);
    setError('');
  };

  const copyText = async (value, label) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Clipboard copy failed.');
    }
  };

  const formattedBalance = Number.isFinite(balance) ? balance.toFixed(4) : '—';

  return (
    <main className="app-shell">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <section className="hero">
        <div className="hero-badge">
          <Sparkles size={16} />
          Qeex GitHub Mail
        </div>
        <h1>GitHub Email Code</h1>
      </section>

      <section className="grid">
        <div className="panel key-panel">
          <div className="panel-title">
            <KeyRound />
            <div>
              <h2>API Key</h2>
            </div>
          </div>

          <label className="input-wrap">
            <span>Qeex API key</span>
            <input
              type="password"
              value={apiKey}
              placeholder="Paste your API key"
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="off"
            />
          </label>

          <div className="button-row">
            <button className="secondary-button" onClick={refreshBalance} disabled={!hasKey || isBalanceLoading}>
              {isBalanceLoading ? <Loader2 className="spin" /> : <RefreshCcw />}
              Refresh balance
            </button>
            <button className="ghost-button" onClick={clearKey} disabled={!hasKey}>
              <Trash2 />
              Clear key
            </button>
          </div>
        </div>

        <div className="panel balance-card">
          <div className="panel-title">
            <Wallet />
            <div>
              <h2>Balance</h2>
            </div>
          </div>
          <div className="balance-value">${formattedBalance}</div>
        </div>
      </section>

      <section className="panel activation-panel">
        <div className="activation-header">
          <div className="panel-title">
            <Code2 />
            <div>
              <h2>GitHub Email</h2>
            </div>
          </div>

          <button className="primary-button" onClick={orderEmail} disabled={!hasKey || isOrdering}>
            {isOrdering ? <Loader2 className="spin" /> : <Mail />}
            Get email
          </button>
        </div>

        {activations.length === 0 ? (
          <div className="empty-state">
            <Mail size={42} />
            <h3>No email yet</h3>
          </div>
        ) : (
          <div className="activation-list">
            {activations.map((item) => {
              const secondsActive = getSecondsActive(item, now);
              const secondsLeft = getSecondsLeft(item, now);
              const expired = secondsLeft <= 0 && !item.received;
              const cancelUnlockSecondsLeft = Math.max(CANCEL_UNLOCK_SECONDS - secondsActive, 0);
              const isCancelling = cancellingIds.has(item.id);
              const canCancel = canCancelActivation(item, now, cancellingIds);

              return (
                <article className="activation-card" key={item.id}>
                  <div className="activation-grid">
                    <InfoCard icon={<Mail />} label="Email address" value={item.email}>
                      <button className="icon-button" onClick={() => copyText(item.email, 'email')}>
                        <Copy />
                      </button>
                    </InfoCard>
                    <InfoCard icon={<Clock3 />} label="Expires in" value={formatTime(secondsLeft)} accent={expired ? 'danger' : 'blue'} />
                    <InfoCard icon={<Clipboard />} label="Activation ID" value={item.id} compact />
                  </div>

                  <div className="code-stage">
                    <div className={`pulse-ring ${item.received ? 'received' : expired ? 'expired' : ''}`}>
                      {item.received ? <CheckCircle2 /> : expired ? <XCircle /> : <Activity />}
                    </div>
                    <div className="code-content">
                      <span className="eyebrow">Activation code</span>
                      <strong>{item.received ? item.code || 'Received' : expired ? 'Expired' : 'Waiting for email...'}</strong>
                    </div>
                    <div className="code-actions">
                      <button className="secondary-button" onClick={() => copyText(item.code, 'code')} disabled={!item.code}>
                        <Copy />
                        Copy code
                      </button>
                      <button className="ghost-button" onClick={() => cancelActivation(item)} disabled={!canCancel}>
                        {isCancelling ? <Loader2 className="spin" /> : <XCircle />}
                        {isCancelling
                          ? 'Cancelling...'
                          : cancelUnlockSecondsLeft > 0 && !item.received && !expired
                            ? `Cancel email (${cancelUnlockSecondsLeft}s)`
                            : 'Cancel email'}
                      </button>
                      <button className="ghost-button" onClick={() => removeActivationCard(item.id)}>
                        <Trash2 />
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            <button className="ghost-button clear-all-button" onClick={resetActivation}>
              <RefreshCcw />
              Clear list
            </button>
          </div>
        )}
      </section>

      <footer className="credit">
        Created by{' '}
        <a href="https://t.me/qtkaybee" target="_blank" rel="noreferrer">
          qtkaybee
        </a>
      </footer>

      {error && <div className="toast error">{error}</div>}
      {copied && <div className="toast success">Copied {copied} to clipboard.</div>}
    </main>
  );
}

function InfoCard({ icon, label, value, children, accent = 'blue', compact = false }) {
  return (
    <div className={`info-card ${accent} ${compact ? 'compact' : ''}`}>
      <div className="info-icon">{icon}</div>
      <div className="info-body">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      {children}
    </div>
  );
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getSecondsActive(activation, now) {
  if (!activation?.createdAt) {
    return 0;
  }

  return Math.max(Math.floor((now - activation.createdAt) / 1000), 0);
}

function getSecondsLeft(activation, now) {
  if (!activation?.createdAt) {
    return 0;
  }

  return Math.max(ACTIVATION_SECONDS - getSecondsActive(activation, now), 0);
}

function canCancelActivation(activation, now, cancellingIds) {
  if (!activation?.id || activation.received || getSecondsLeft(activation, now) <= 0 || cancellingIds.has(activation.id)) {
    return false;
  }

  return getSecondsActive(activation, now) >= CANCEL_UNLOCK_SECONDS;
}

function loadStoredActivations() {
  try {
    const raw = localStorage.getItem(ACTIVATIONS_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(isValidActivation);
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_ACTIVATION_STORAGE);
    if (!legacyRaw) {
      return [];
    }

    const legacy = JSON.parse(legacyRaw);
    return isValidActivation(legacy) ? [{ ...legacy, code: legacy.code || '', received: Boolean(legacy.received) }] : [];
  } catch {
    return [];
  }
}

function isValidActivation(value) {
  return Boolean(value?.id && value?.email && value?.createdAt);
}

createRoot(document.getElementById('root')).render(<App />);
