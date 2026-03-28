import { useEffect, useState } from 'react';
import {
  getSubscriptionPlans, sendLoginCode, verifyLoginCode,
  getMySubscription, createSubscriptionCheckout, getSubscriptionPortalUrl,
  type SubscriptionPlan, type MySubscriptionResponse,
} from '../api';

const TOKEN_KEY = 'gentry_customer_token';
const CUSTOMER_KEY = 'gentry_customer';

type AuthStep = 'idle' | 'email' | 'code' | 'done';

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const PLAN_TYPE_LABELS: Record<string, { label: string; color: string; badge: string }> = {
  booking_credits: { label: 'Booking Credits', color: '#2563eb', badge: '#dbeafe' },
  product_discount: { label: 'Product Discount', color: '#059669', badge: '#d1fae5' },
  vip_access:      { label: 'VIP Access',       color: '#d97706', badge: '#fef3c7' },
  custom:          { label: 'Custom Benefits',  color: '#7c3aed', badge: '#ede9fe' },
};

function PlanBadge({ planType }: { planType: string }) {
  const info = PLAN_TYPE_LABELS[planType] ?? PLAN_TYPE_LABELS.custom;
  return (
    <span style={{ background: info.badge, color: info.color }}
      className="text-xs font-semibold px-2 py-0.5 rounded-full">
      {info.label}
    </span>
  );
}

function PlanBenefits({ plan }: { plan: SubscriptionPlan }) {
  if (plan.planType === 'booking_credits' && plan.creditsPerMonth > 0) {
    return (
      <p className="text-sm text-gray-600">
        <strong>{plan.creditsPerMonth} {plan.creditLabel}{plan.creditsPerMonth !== 1 ? 's' : ''}</strong> per month
        {plan.rolloverCredits && (
          <span className="text-gray-400">
            {' '}· rollover{plan.maxRollover != null ? ` (max ${plan.maxRollover})` : ''}
          </span>
        )}
      </p>
    );
  }
  if (plan.planType === 'product_discount' && plan.discountPercent != null) {
    return (
      <p className="text-sm" style={{ color: '#059669' }}>
        <strong>{plan.discountPercent}% off</strong> all products at checkout
      </p>
    );
  }
  return null;
}

export default function Membership() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [customer, setCustomer] = useState<{ id: string; email: string; name: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || 'null'); } catch { return null; }
  });
  const [mySubData, setMySubData] = useState<MySubscriptionResponse | null>(null);
  const [loadingSub, setLoadingSub] = useState(false);

  const [authStep, setAuthStep] = useState<AuthStep>('idle');
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    getSubscriptionPlans()
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setLoadingPlans(false));
  }, []);

  useEffect(() => {
    if (!token) { setMySubData(null); return; }
    setLoadingSub(true);
    getMySubscription(token)
      .then(d => setMySubData(d))
      .catch(() => setMySubData(null))
      .finally(() => setLoadingSub(false));
  }, [token]);

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    setToken(null);
    setCustomer(null);
    setMySubData(null);
    setAuthStep('idle');
  }

  async function handleSendCode() {
    if (!email) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await sendLoginCode(email, name || undefined);
      if (res.isNewAccount && !name) {
        setIsNewAccount(true);
        setAuthError('This email isn\'t registered yet. Please enter your name to create an account.');
        setAuthLoading(false);
        return;
      }
      setIsNewAccount(res.isNewAccount ?? false);
      setAuthStep('code');
    } catch (e: any) {
      setAuthError(e.message ?? 'Failed to send code. Try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!code) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await verifyLoginCode(email, code, isNewAccount ? name : undefined);
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(res.customer));
      setToken(res.token);
      setCustomer(res.customer);
      setAuthStep('done');
      if (pendingPlanId) {
        await handleCheckout(res.token, pendingPlanId);
        setPendingPlanId(null);
      }
    } catch (e: any) {
      setAuthError(e.message ?? 'Invalid code. Try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleCheckout(tok: string, planId: string) {
    setCheckoutLoading(planId);
    setActionError(null);
    try {
      const { url } = await createSubscriptionCheckout(
        tok, planId,
        `${window.location.origin}/membership?sub=success`,
        `${window.location.origin}/membership`,
      );
      window.location.href = url;
    } catch (e: any) {
      setActionError(e.message ?? 'Could not start checkout. Please try again.');
      setCheckoutLoading(null);
    }
  }

  async function handleManage() {
    if (!token) return;
    setPortalLoading(true);
    setActionError(null);
    try {
      const { url } = await getSubscriptionPortalUrl(token, `${window.location.origin}/membership`);
      window.location.href = url;
    } catch (e: any) {
      setActionError(e.message ?? 'Could not open billing portal.');
    } finally {
      setPortalLoading(false);
    }
  }

  function handleSubscribeClick(planId: string) {
    setActionError(null);
    if (token) {
      handleCheckout(token, planId);
    } else {
      setPendingPlanId(planId);
      setAuthStep('email');
    }
  }

  function dismissAuth() {
    setAuthStep('idle');
    setAuthError(null);
    setPendingPlanId(null);
    setEmail('');
    setCode('');
    setName('');
    setIsNewAccount(false);
  }

  const activeSub = mySubData?.subscription;
  const activePlan = mySubData?.plan;
  const isSubscribed = activeSub?.status === 'active';
  const isOnCurrentPlan = (planId: string) => activePlan?.id === planId && isSubscribed;

  const urlParams = new URLSearchParams(window.location.search);
  const subResult = urlParams.get('sub');

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Success banner */}
      {subResult === 'success' && (
        <div className="mb-8 rounded-xl bg-green-50 border border-green-200 px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-semibold text-green-800">You're now a member!</p>
            <p className="text-sm text-green-700 mt-0.5">Your subscription is active. Credits will appear in your account shortly.</p>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold mb-1">Membership Plans</h1>
      <p className="text-gray-500 mb-10">Subscribe for monthly benefits — booking credits, product discounts, and more.</p>

      {/* Current subscription banner */}
      {token && loadingSub && (
        <div className="mb-8 rounded-xl border border-gray-200 px-5 py-4 animate-pulse bg-gray-50 h-20" />
      )}
      {token && !loadingSub && isSubscribed && activePlan && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Your membership</p>
            <p className="font-semibold text-lg">{activePlan.name}</p>
            <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600">
              {activePlan.planType === 'booking_credits' && (
                <span>
                  <strong>{activeSub.creditBalance}</strong> {activePlan.creditLabel}{activeSub.creditBalance !== 1 ? 's' : ''} remaining
                </span>
              )}
              {activePlan.planType === 'product_discount' && activePlan.discountPercent != null && (
                <span className="text-green-700 font-medium">{activePlan.discountPercent}% off products active</span>
              )}
              <span className="text-gray-400">
                {activeSub.cancelAtPeriodEnd ? '⚠ Cancels' : 'Renews'} {fmtDate(activeSub.currentPeriodEnd)}
              </span>
            </div>
            {mySubData && mySubData.ledger.length > 0 && activePlan.planType === 'booking_credits' && (
              <div className="mt-3 space-y-0.5">
                <p className="text-xs text-gray-400 mb-1">Recent credit activity</p>
                {mySubData.ledger.slice(0, 3).map(e => (
                  <div key={e.id} className="flex justify-between text-xs text-gray-500">
                    <span>{e.reason}</span>
                    <span className={e.changeAmount >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                      {e.changeAmount >= 0 ? '+' : ''}{e.changeAmount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleManage}
            disabled={portalLoading}
            className="shrink-0 border border-gray-300 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            {portalLoading ? 'Opening…' : 'Manage / Cancel'}
          </button>
        </div>
      )}

      {/* Plans grid */}
      {loadingPlans ? (
        <div className="grid sm:grid-cols-2 gap-5">
          {[0, 1].map(i => (
            <div key={i} className="animate-pulse h-56 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">✦</p>
          <p className="font-medium">No membership plans available yet.</p>
          <p className="text-sm mt-1">Check back soon!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {plans.map(plan => {
            const alreadyOnPlan = isOnCurrentPlan(plan.id);
            return (
              <div key={plan.id} className="rounded-2xl border border-gray-200 bg-white p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-xl font-bold leading-tight">{plan.name}</h2>
                  <PlanBadge planType={plan.planType} />
                </div>

                {plan.description && (
                  <p className="text-sm text-gray-500 leading-relaxed">{plan.description}</p>
                )}

                <PlanBenefits plan={plan} />

                <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-2xl font-bold">{fmt(plan.priceMonthly)}</span>
                    <span className="text-gray-400 text-sm">/month</span>
                  </div>
                  {alreadyOnPlan ? (
                    <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                      ✓ Current plan
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSubscribeClick(plan.id)}
                      disabled={checkoutLoading === plan.id}
                      className="bg-black text-white font-semibold px-5 py-2 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 text-sm"
                    >
                      {checkoutLoading === plan.id ? 'Loading…' : 'Subscribe'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {actionError && (
        <p className="mt-4 text-sm text-red-500 text-center">{actionError}</p>
      )}

      {/* Already a member sign-in prompt */}
      {!token && authStep === 'idle' && (
        <div className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 px-6 py-8 text-center">
          <p className="text-gray-500 text-sm">
            Already a member?{' '}
            <button onClick={() => setAuthStep('email')} className="text-black font-semibold underline">
              Sign in to view your account
            </button>
          </p>
        </div>
      )}

      {/* Signed-in footer */}
      {token && customer && (
        <div className="mt-12 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-md">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Signed in as</p>
            <p className="text-sm font-semibold">{customer.name}</p>
            <p className="text-xs text-gray-500">{customer.email}</p>
          </div>
          <button onClick={signOut} className="text-sm text-gray-400 hover:text-gray-700 font-medium border border-gray-200 rounded-lg px-3 py-1.5">
            Sign out
          </button>
        </div>
      )}

      {/* Auth modal */}
      {!token && (authStep === 'email' || authStep === 'code') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={dismissAuth}
        >
          <div
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-7 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* X close button */}
            <button
              onClick={dismissAuth}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>

            {authStep === 'email' && (
              <>
                <h2 className="text-lg font-bold pr-6">
                  {pendingPlanId ? 'Sign in to subscribe' : 'Sign in to your account'}
                </h2>
                <p className="text-sm text-gray-500">
                  We'll email you a 4-digit code — no password needed.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !isNewAccount && handleSendCode()}
                    placeholder="you@example.com"
                    autoFocus
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                {isNewAccount && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Your name <span className="text-gray-400">(new account)</span></label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendCode()}
                      placeholder="Full name"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                )}
                {authError && <p className="text-sm text-red-500">{authError}</p>}
                <button
                  onClick={handleSendCode}
                  disabled={authLoading || !email || (isNewAccount && !name)}
                  className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
                >
                  {authLoading ? 'Sending…' : 'Send code'}
                </button>
              </>
            )}

            {authStep === 'code' && (
              <>
                <h2 className="text-lg font-bold pr-6">Check your email</h2>
                <p className="text-sm text-gray-500">
                  We sent a 4-digit code to <strong>{email}</strong>.
                  It expires in 10 minutes.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && code.length === 4 && handleVerifyCode()}
                    placeholder="1234"
                    autoFocus
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black tracking-widest text-center text-lg"
                  />
                </div>
                {authError && <p className="text-sm text-red-500">{authError}</p>}
                <button
                  onClick={handleVerifyCode}
                  disabled={authLoading || code.length !== 4}
                  className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
                >
                  {authLoading ? 'Verifying…' : 'Verify code'}
                </button>
                <button
                  onClick={() => { setAuthStep('email'); setCode(''); setAuthError(null); }}
                  className="w-full text-sm text-gray-400 hover:text-gray-600"
                >
                  ← Back / resend
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
