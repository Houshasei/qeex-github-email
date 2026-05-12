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
const ACTIVATION_STORAGE = 'qeex_github_activation';
const SITE = 'github.com';
const MAILBOX_DOMAIN = 'yandex.com';
const ACTIVATION_SECONDS = 20 * 60;
const POLL_INTERVAL_MS = 1000;

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [balance, setBalance] = useState(null);
  const [activation, setActivation] = useState(() => loadStoredActivation());
  const [code, setCode] = useState('');
  const [received, setReceived] = useState(false);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [now, setNow] = useState(Date.now());
  const pollRef = useRef(null);

  const hasKey = apiKey.trim().length > 0;
  const secondsLeft = useMemo(() => {
    if (!activation?.createdAt) {
      return 0;
    }

    const elapsed = Math.floor((now - activation.createdAt) / 1000);
    return Math.max(ACTIVATION_SECONDS - elapsed, 0);
  }, [activation, now]);
  const expired = Boolean(activation) && secondsLeft <= 0 && !received;

  useEffect(() => {
    localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
  }, [apiKey]);

  useEffect(() => {
    if (activation) {
      localStorage.setItem(ACTIVATION_STORAGE, JSON.stringify(activation));
    } else {
      localStorage.removeItem(ACTIVATION_STORAGE);
    }
  }, [activation]);

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

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const pollCode = useCallback(async () => {
    if (!activation?.id || secondsLeft <= 0 || received) {
      stopPolling();
      return;
    }

    try {
      const result = await callQeex('emailCode', { id: activation.id });
      if (result?.received) {
        setCode(result.code || '');
        setReceived(true);
        stopPolling();
        await refreshBalance();
      }
    } catch (caught) {
      setError(caught.message);
      stopPolling();
    }
  }, [activation?.id, callQeex, received, refreshBalance, secondsLeft, stopPolling]);

  const startPolling = useCallback(() => {
    if (!activation?.id || expired || received || pollRef.current) {
      return;
    }

    setIsPolling(true);
    pollCode();
    pollRef.current = window.setInterval(pollCode, POLL_INTERVAL_MS);
  }, [activation?.id, expired, pollCode, received]);

  useEffect(() => {
    if (activation?.id && !expired && !received && hasKey) {
      startPolling();
    }

    return stopPolling;
  }, [activation?.id, expired, hasKey, received, startPolling, stopPolling]);

  useEffect(() => {
    if (expired) {
      stopPolling();
    }
  }, [expired, stopPolling]);

  const orderEmail = async () => {
    setError('');
    setCode('');
    setReceived(false);
    stopPolling();
    setIsOrdering(true);

    try {
      const result = await callQeex('emailGet', {
        site: SITE,
        domain: MAILBOX_DOMAIN,
      });

      setActivation({
        id: result.id,
        email: result.email,
        site: result.site || SITE,
        domain: MAILBOX_DOMAIN,
        createdAt: Date.now(),
      });
      await refreshBalance();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setIsOrdering(false);
    }
  };

  const cancelActivation = async () => {
    if (!activation?.id) {
      return;
    }

    const confirmed = window.confirm('Cancel this email and request a refund?');
    if (!confirmed) {
      return;
    }

    setError('');
    stopPolling();
    setIsCancelling(true);

    try {
      await callQeex('emailCancel', { id: activation.id });
      setActivation(null);
      setCode('');
      setReceived(false);
      await refreshBalance();
    } catch (caught) {
      setError(caught.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const clearKey = () => {
    setApiKey('');
    setBalance(null);
    setError('');
    stopPolling();
  };

  const resetActivation = () => {
    stopPolling();
    setActivation(null);
    setCode('');
    setReceived(false);
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

        {activation ? (
          <div className="activation-grid">
            <InfoCard icon={<Mail />} label="Email address" value={activation.email}>
              <button className="icon-button" onClick={() => copyText(activation.email, 'email')}>
                <Copy />
              </button>
            </InfoCard>
            <InfoCard icon={<Clock3 />} label="Expires in" value={formatTime(secondsLeft)} accent={expired ? 'danger' : 'blue'} />
            <InfoCard icon={<Clipboard />} label="Activation ID" value={activation.id} compact />
          </div>
        ) : (
          <div className="empty-state">
            <Mail size={42} />
            <h3>No email yet</h3>
          </div>
        )}

        {activation && (
          <div className="code-stage">
            <div className={`pulse-ring ${received ? 'received' : expired ? 'expired' : ''}`}>
              {received ? <CheckCircle2 /> : expired ? <XCircle /> : <Activity />}
            </div>
            <div className="code-content">
              <span className="eyebrow">Activation code</span>
              <strong>{received ? code || 'Received' : expired ? 'Expired' : 'Waiting for email...'}</strong>
            </div>
            <div className="code-actions">
              <button className="secondary-button" onClick={() => copyText(code, 'code')} disabled={!code}>
                <Copy />
                Copy code
              </button>
              <button className="ghost-button" onClick={cancelActivation} disabled={!activation?.id || received || expired || isCancelling}>
                {isCancelling ? <Loader2 className="spin" /> : <XCircle />}
                Cancel email
              </button>
              <button className="ghost-button" onClick={resetActivation}>
                <RefreshCcw />
                Reset
              </button>
            </div>
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

function loadStoredActivation() {
  try {
    const raw = localStorage.getItem(ACTIVATION_STORAGE);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.id || !parsed?.email || !parsed?.createdAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

createRoot(document.getElementById('root')).render(<App />);
