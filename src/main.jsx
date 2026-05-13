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
const WAVESPEED_API_KEYS_STORAGE = 'wavespeed_balance_keys';
const PAGE_HASHES = new Set(['qeex', 'wavespeed']);
const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const LOVE_QUOTES = [
  'Si EJ ug Angelika dili muundang bisan kapoy na ang adlaw.',
  'Si EJ ug Angelika magpadayon kay ang gugma dili basta mosurrender.',
  'Si EJ ug Angelika kabalo nga ang lisod karon mahimong kalig-on ugma.',
  'Si EJ ug Angelika mopili gihapon sa paglaum kada segundo.',
  'Si EJ ug Angelika dili magpildi sa kahadlok.',
  'Si EJ ug Angelika magkupot sa damgo hangtod maabot.',
  'Si EJ ug Angelika mutindog balik bisan kapila matumba.',
  'Si EJ ug Angelika nagtuo nga kaya pa, pirmi pa.',
  'Si EJ ug Angelika dili biyaan ang pangandoy.',
  'Si EJ ug Angelika padayon lang, hinay man pero sigurado.',
  'Si EJ ug Angelika mas lig-on pa sa unos.',
  'Si EJ ug Angelika magpabilin bisan lisod ang dalan.',
  'Si EJ ug Angelika dili mahadlok magsugod usab.',
  'Si EJ ug Angelika kabalo nga kada hulat naay bunga.',
  'Si EJ ug Angelika magtinabangay hangtod molamdag ang tanan.',
  'Si EJ ug Angelika dili magpadala sa kaluya.',
  'Si EJ ug Angelika magpuyo sa pagtuo, dili sa duda.',
  'Si EJ ug Angelika kanunay mopili sa usag usa.',
  'Si EJ ug Angelika nagdala ug kusog sa matag damgo.',
  'Si EJ ug Angelika dili musibog kung klaro ang tumong.',
  'Si EJ ug Angelika moingon, kaya nato ni.',
  'Si EJ ug Angelika magpadayon bisan walay sayon nga agianan.',
  'Si EJ ug Angelika dili magpaalkansi sa problema.',
  'Si EJ ug Angelika mas mohayag kung ngitngit ang palibot.',
  'Si EJ ug Angelika nagpakita nga ang tinuod nga gugma molahutay.',
  'Si EJ ug Angelika dili muhunong hangtod makita ang kadaugan.',
  'Si EJ ug Angelika motuo sa gamay nga progreso kada adlaw.',
  'Si EJ ug Angelika magtinud-anay, magtinabangay, magpadayon.',
  'Si EJ ug Angelika dili magpildi sa kalibog.',
  'Si EJ ug Angelika nagpabilin nga lig-on bisan hilom ang away.',
  'Si EJ ug Angelika magdala ug kahayag sa usag usa.',
  'Si EJ ug Angelika dili kalimot nga worth it ang paningkamot.',
  'Si EJ ug Angelika magpadayon kay naay rason nga mahalon.',
  'Si EJ ug Angelika mutan-aw sa ugma nga puno ug paglaum.',
  'Si EJ ug Angelika dili mahurot ang kadasig.',
  'Si EJ ug Angelika motindog bisan sakit ang kapildihan.',
  'Si EJ ug Angelika magpahinumdom nga dili pa tapos ang istorya.',
  'Si EJ ug Angelika dili mosuko sa proseso.',
  'Si EJ ug Angelika mosalig sa panahon ug sa usag usa.',
  'Si EJ ug Angelika maghimo ug milagro sa gamay nga lakang.',
  'Si EJ ug Angelika dili maguba sa temporaryong kalisod.',
  'Si EJ ug Angelika magpabilin nga matinud-anon sa pangandoy.',
  'Si EJ ug Angelika kabalo nga ang paghuwat dili sayang.',
  'Si EJ ug Angelika magtinabangay sa matag pagsulay.',
  'Si EJ ug Angelika dili madaug sa kakapoy.',
  'Si EJ ug Angelika magpadayon bisan hinay ang resulta.',
  'Si EJ ug Angelika mohawid sa paglaum hangtod sa katapusan.',
  'Si EJ ug Angelika dili magpalayo sa damgo.',
  'Si EJ ug Angelika nagtuo nga ang gugma kusog kaayo.',
  'Si EJ ug Angelika magpuyo sa kaisog, dili sa kahadlok.',
  'Si EJ ug Angelika magpabilin bisan lisod sabton ang panahon.',
  'Si EJ ug Angelika dili mosurrender kay naa pay chance.',
  'Si EJ ug Angelika moingon nga ang kapoy pahulay ra, dili undang.',
  'Si EJ ug Angelika magpadayon hangtod ang luha mahimong ngisi.',
  'Si EJ ug Angelika dili magsayang sa paglaum.',
  'Si EJ ug Angelika kabalo nga ang gamay nga lakang dako gihapon.',
  'Si EJ ug Angelika magtukod ug kaugmaon nga dili dali mabungkag.',
  'Si EJ ug Angelika dili mahadlok sa taas nga biyahe.',
  'Si EJ ug Angelika magdala ug kusog bisan sa hilom nga adlaw.',
  'Si EJ ug Angelika dili magpailad sa temporaryong kapakyasan.',
  'Si EJ ug Angelika magpabilin nga duol bisan layo ang agianan.',
  'Si EJ ug Angelika mopili ug pagbangon kada buntag.',
  'Si EJ ug Angelika dili undangan ang butang nga gihigugma.',
  'Si EJ ug Angelika magkupot sa saad ug sa paglaum.',
  'Si EJ ug Angelika motuo nga naay maayo human sa lisod.',
  'Si EJ ug Angelika dili magpaubos sa problema.',
  'Si EJ ug Angelika magpabilin nga kusgan bisan naay kulba.',
  'Si EJ ug Angelika magdala ug inspirasyon sa matag adlaw.',
  'Si EJ ug Angelika dili kalimot nga kaya nila ni.',
  'Si EJ ug Angelika padayon lang bisan daghan ug pangutana.',
  'Si EJ ug Angelika magpuyo nga puno sa pagtuo.',
  'Si EJ ug Angelika dili magpasulabi sa kahadlok kaysa gugma.',
  'Si EJ ug Angelika moabot ra kung dili sila muundang.',
  'Si EJ ug Angelika magpabilin nga solid bisan mokusog ang hangin.',
  'Si EJ ug Angelika dili magtan-aw sa kapildihan isip katapusan.',
  'Si EJ ug Angelika maghimo sa sakit nga leksyon nga kusog.',
  'Si EJ ug Angelika magpadayon kay naay damgo nga naghulat.',
  'Si EJ ug Angelika dili mawala basta magtinabangay.',
  'Si EJ ug Angelika magdala ug neon nga paglaum sa ngitngit.',
  'Si EJ ug Angelika dili mawad-an ug rason nga mopadayon.',
  'Si EJ ug Angelika magtinabangay hangtod mahimong hayag ang tanan.',
  'Si EJ ug Angelika kabalo nga ang tinuod molahutay.',
  'Si EJ ug Angelika dili mobiya sa fight nga importante.',
  'Si EJ ug Angelika magpadayon bisan gamay ra ang makita nga progress.',
  'Si EJ ug Angelika motuo nga ang gugma ug paningkamot mudaug.',
  'Si EJ ug Angelika dili musugot nga pildi ang katapusan.',
  'Si EJ ug Angelika mohawid sa kusog nga gikan sa usag usa.',
  'Si EJ ug Angelika magpabilin nga brave bisan dili perfect.',
  'Si EJ ug Angelika dili muundang kay mahal nila ang pangandoy.',
  'Si EJ ug Angelika magpadayon bisan ulan, init, o bagyo.',
  'Si EJ ug Angelika naghimo sa kada segundo nga chance.',
  'Si EJ ug Angelika dili makalimot nga ang kalisod temporaryo ra.',
  'Si EJ ug Angelika magtukod ug storya nga dili basta mahuman.',
  'Si EJ ug Angelika magpabilin nga lig-on sa gugma ug kinabuhi.',
  'Si EJ ug Angelika dili maghunahuna ug give up karon.',
  'Si EJ ug Angelika motuo nga ang best padulong pa.',
  'Si EJ ug Angelika magpadayon hangtod ang impossible mahimong tinuod.',
  'Si EJ ug Angelika dili mubiya sa usag usa ug sa damgo.',
  'Si EJ ug Angelika magdala ug paglaum bisan asa sila moadto.',
  'Si EJ ug Angelika dili mohunong kay ang ilang storya nagsugod pa.',
];

function QeexPage() {
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
  const pollCursorRef = useRef(0);
  const isPollingRequestRef = useRef(false);
  const activationsRef = useRef([]);
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

  useEffect(() => {
    activationsRef.current = activations;
  }, [activations]);

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
    isPollingRequestRef.current = false;
    setIsPolling(false);
  }, []);

  const pollCodes = useCallback(async () => {
    if (isPollingRequestRef.current) {
      return;
    }

    const waitingActivations = activationsRef.current.filter((item) => {
      const expired = getSecondsLeft(item, Date.now()) <= 0;
      return !item.received && !expired;
    });

    if (waitingActivations.length === 0) {
      stopPolling();
      return;
    }

    const activation = waitingActivations[pollCursorRef.current % waitingActivations.length];
    pollCursorRef.current += 1;
    isPollingRequestRef.current = true;

    try {
      const result = await callQeex('emailCode', { id: activation.id });
      if (result?.received) {
        updateActivation(activation.id, {
          code: result.code || '',
          received: true,
          receivedAt: Date.now(),
        });
        await refreshBalance();
      }
    } catch (caught) {
      setError(caught.message);
    } finally {
      isPollingRequestRef.current = false;
    }
  }, [callQeex, refreshBalance, stopPolling, updateActivation]);

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

  const formattedBalance = Number.isFinite(balance) ? balance.toFixed(4) : '--';
  const currentQuote = LOVE_QUOTES[Math.floor(now / 30000) % LOVE_QUOTES.length];

  return (
    <>
      <section className="hero">
        <div className="hero-badge">
          <Sparkles size={16} />
          Qeex GitHub Mail
        </div>
        <h1>GitHub Email Code</h1>
        <div className="quote-card">
          <span>EJ × Angelika</span>
          <strong>{currentQuote}</strong>
        </div>
      </section>

      <section className={`grid ${hasKey ? 'key-saved' : ''}`}>
        {!hasKey && (
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
          </div>
        )}

        <div className="panel balance-card">
          <div className="balance-header">
            <div className="panel-title">
              <Wallet />
              <div>
                <h2>Balance</h2>
              </div>
            </div>

            <div className="balance-actions">
              <button className="icon-button" onClick={refreshBalance} disabled={!hasKey || isBalanceLoading} aria-label="Refresh balance" title="Refresh balance">
                {isBalanceLoading ? <Loader2 className="spin" /> : <RefreshCcw />}
              </button>
              <button className="icon-button" onClick={clearKey} disabled={!hasKey} aria-label="Clear API key" title="Clear API key">
                <Trash2 />
              </button>
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

      {error && <div className="toast error">{error}</div>}
      {copied && <div className="toast success">Copied {copied} to clipboard.</div>}
    </>
  );
}

function App() {
  const [activePage, setActivePage] = useState(() => readActivePageFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setActivePage(readActivePageFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const nextHash = `#${activePage}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [activePage]);

  return (
    <main className="app-shell">
      <div className="orb orb-one" />
      <div className="orb orb-two" />

      <nav className="view-switcher" aria-label="Project pages">
        <button
          className={`view-switcher-button ${activePage === 'qeex' ? 'active' : ''}`}
          onClick={() => setActivePage('qeex')}
          type="button"
        >
          <Mail />
          GitHub Email
        </button>
        <button
          className={`view-switcher-button ${activePage === 'wavespeed' ? 'active' : ''}`}
          onClick={() => setActivePage('wavespeed')}
          type="button"
        >
          <Wallet />
          WaveSpeed Balance
        </button>
      </nav>

      {activePage === 'wavespeed' ? <WaveSpeedBalancePage /> : <QeexPage />}

      <footer className="credit">
        Created by{' '}
        <a href="https://t.me/qtkaybee" target="_blank" rel="noreferrer">
          qtkaybee
        </a>
      </footer>
    </main>
  );
}

function WaveSpeedBalancePage() {
  const [rawApiKeys, setRawApiKeys] = useState(() => localStorage.getItem(WAVESPEED_API_KEYS_STORAGE) || '');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('Paste one API key per line, then click Check balances.');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    localStorage.setItem(WAVESPEED_API_KEYS_STORAGE, rawApiKeys);
  }, [rawApiKeys]);

  const apiKeys = useMemo(
    () => rawApiKeys.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    [rawApiKeys],
  );

  const summary = useMemo(
    () =>
      results.reduce(
        (totals, result) => {
          if (result.status === 'Has balance') {
            totals.withBalance += 1;
          } else if (result.status === 'No balance') {
            totals.withoutBalance += 1;
          } else {
            totals.errors += 1;
          }

          return totals;
        },
        { withBalance: 0, withoutBalance: 0, errors: 0 },
      ),
    [results],
  );

  const checkBalances = useCallback(async () => {
    if (apiKeys.length === 0) {
      setError('Enter at least one WaveSpeed API key.');
      return;
    }

    setError('');
    setCopied('');
    setResults([]);
    setStatus(`Checking 0 of ${apiKeys.length} API key(s)...`);
    setIsChecking(true);

    const nextResults = [];

    for (const [index, apiKey] of apiKeys.entries()) {
      let row;

      try {
        const result = await fetchWaveSpeedBalance(apiKey);
        row = normalizeWaveSpeedResult(apiKey, result.balance, index);
      } catch (caught) {
        row = createWaveSpeedErrorRow(apiKey, caught, index);
      }

      nextResults.push(row);
      setResults([...nextResults]);
      setStatus(`Checked ${index + 1} of ${apiKeys.length} API key(s)...`);
    }

    setStatus(`Finished checking ${apiKeys.length} API key(s).`);
    setIsChecking(false);
  }, [apiKeys]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError('');
    setCopied('');
    setStatus('Paste one API key per line, then click Check balances.');
  }, []);

  const clearKeys = useCallback(() => {
    setRawApiKeys('');
    clearResults();
  }, [clearResults]);

  const copyWaveSpeedKey = useCallback(async (value) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied('WaveSpeed API key');
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Clipboard copy failed.');
    }
  }, []);

  const statusTone = error ? 'danger' : summary.errors > 0 ? 'warning' : 'good';

  return (
    <>
      <section className="hero">
        <div className="hero-badge">
          <Sparkles size={16} />
          WaveSpeed Utility
        </div>
        <h1>WaveSpeed Balance Checker</h1>
        <p>Paste one API key per line to separate funded keys, zero-balance keys, and API errors in one clean run.</p>
        <div className="quote-card">
          <span>Batch Lookup</span>
          <strong>Balances stay inside the site and match the same neon-green visual system.</strong>
          <p>Each key is checked through a local proxy route so the page can reuse the existing project flow instead of sending keys in the URL.</p>
        </div>
      </section>

      <section className="grid wavespeed-grid">
        <div className="panel key-panel wavespeed-key-panel">
          <div className="panel-title">
            <KeyRound />
            <div>
              <h2>WaveSpeed Keys</h2>
              <p>One API key per line. Results update as each lookup completes.</p>
            </div>
          </div>

          <label className="input-wrap textarea-wrap">
            <span>API keys</span>
            <textarea
              value={rawApiKeys}
              onChange={(event) => setRawApiKeys(event.target.value)}
              placeholder={'Paste one WaveSpeed API key per line\nws_live_key_one\nws_live_key_two'}
              spellCheck="false"
            />
          </label>

          <div className="button-row">
            <button className="primary-button" onClick={checkBalances} disabled={apiKeys.length === 0 || isChecking} type="button">
              {isChecking ? <Loader2 className="spin" /> : <Wallet />}
              Check balances
            </button>
            <button className="secondary-button" onClick={clearResults} disabled={isChecking || results.length === 0} type="button">
              <RefreshCcw />
              Clear results
            </button>
            <button className="ghost-button" onClick={clearKeys} disabled={isChecking || rawApiKeys.trim().length === 0} type="button">
              <Trash2 />
              Clear keys
            </button>
          </div>
        </div>

        <div className="panel balance-card wavespeed-summary-card">
          <div className="panel-title">
            <Activity />
            <div>
              <h2>Run Summary</h2>
              <p>{apiKeys.length} key(s) ready in the input box.</p>
            </div>
          </div>

          <div className="summary-grid">
            <SummaryCard label="With balance" value={summary.withBalance} tone="positive" />
            <SummaryCard label="No balance" value={summary.withoutBalance} tone="neutral" />
            <SummaryCard label="Errors" value={summary.errors} tone="error" />
          </div>

          <div className={`status-pill ${statusTone}`}>
            {isChecking ? <Loader2 className="spin" /> : <Sparkles size={16} />}
            {error || status}
          </div>
        </div>
      </section>

      <section className="panel activation-panel wavespeed-results-panel">
        <div className="activation-header">
          <div className="panel-title">
            <Code2 />
            <div>
              <h2>Balance Results</h2>
              <p>Funded keys are green, zero-balance keys stay muted, and API failures are highlighted separately.</p>
            </div>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="empty-state">
            <Wallet size={42} />
            <h3>No balance results yet</h3>
            <p>Run a batch check to list each key, its balance, and any API response details.</p>
          </div>
        ) : (
          <div className="balance-table" role="table" aria-label="WaveSpeed balance results">
            <div className="balance-table-head" role="row">
              <span role="columnheader">API key</span>
              <span role="columnheader">Balance</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Details</span>
              <span role="columnheader">Action</span>
            </div>

            {results.map((result) => (
              <article className={`balance-table-row ${result.tone}`} key={result.id} role="row">
                <code className="balance-key" role="cell">
                  {result.apiKey}
                </code>
                <strong className="balance-amount" role="cell">
                  {result.balance}
                </strong>
                <span className={`result-status ${result.tone}`} role="cell">
                  {result.status}
                </span>
                <p className="balance-detail" role="cell">
                  {result.details}
                </p>
                <div className="balance-table-action" role="cell">
                  <button className="icon-button" onClick={() => copyWaveSpeedKey(result.apiKey)} type="button" aria-label="Copy API key" title="Copy API key">
                    <Copy />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {error && <div className="toast error">{error}</div>}
      {copied && <div className="toast success">Copied {copied} to clipboard.</div>}
    </>
  );
}

function SummaryCard({ label, value, tone }) {
  return (
    <div className={`summary-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function readActivePageFromHash() {
  const page = window.location.hash.replace(/^#/, '').toLowerCase();
  return PAGE_HASHES.has(page) ? page : 'qeex';
}

async function fetchWaveSpeedBalance(apiKey) {
  const response = await fetch(new URL('/api/wavespeed/balance', window.location.origin), {
    headers: {
      'X-Wavespeed-Key': apiKey.trim(),
      Accept: 'application/json',
    },
  });

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error('Unexpected response from the WaveSpeed proxy.');
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || 'WaveSpeed request failed.');
  }

  return payload.result;
}

function normalizeWaveSpeedResult(apiKey, balanceValue, index) {
  const balance = Number(balanceValue);

  if (!Number.isFinite(balance)) {
    return createWaveSpeedErrorRow(apiKey, new Error('Balance value is missing or invalid.'), index);
  }

  const hasBalance = balance > 0;

  return {
    id: `${apiKey}-${index}`,
    apiKey,
    balance: USD_FORMATTER.format(balance),
    status: hasBalance ? 'Has balance' : 'No balance',
    details: hasBalance ? 'Balance is available.' : 'Balance is zero.',
    tone: hasBalance ? 'positive' : 'neutral',
  };
}

function createWaveSpeedErrorRow(apiKey, error, index) {
  return {
    id: `${apiKey}-${index}-error`,
    apiKey,
    balance: '--',
    status: 'Error',
    details: error instanceof Error ? error.message : 'Unexpected WaveSpeed error.',
    tone: 'error',
  };
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
