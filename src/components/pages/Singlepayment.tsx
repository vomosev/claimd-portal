// src/components/page/Singlepayment.tsx
"use client";

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Check, Mail, Lock, Minus, Plus, Ticket, Info } from "lucide-react";
import { Award, geoDropsApi } from '@/services/api';
import Image from 'next/image';
import logo from "@/assets/logo.png";

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY || "pk_live_kCkZDH2dpISTB7lLUfVAaiPy";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PlanFeature {
  text: string;
}

interface Plan {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  features: PlanFeature[];
  price?: string;
  isFree?: boolean;
}

// ── Fee config ─────────────────────────────────────────────────────────────────
// 1 unit of the selected currency added as a flat processing fee
const PROCESSING_FEE = 0.00;

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg
      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ── Ticket quantity stepper ────────────────────────────────────────────────────
function TicketStepper({
  quantity,
  onChange,
  disabled,
  maxTickets = 10,
}: {
  quantity: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  maxTickets?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Number of tickets
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, quantity - 1))}
          disabled={disabled || quantity <= 1}
          className="
            w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600
            flex items-center justify-center
            hover:bg-gray-100 dark:hover:bg-gray-700
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <Minus size={14} />
        </button>

        <span className="w-10 text-center text-2xl font-bold tabular-nums">
          {quantity}
        </span>

        <button
          type="button"
          onClick={() => onChange(Math.min(maxTickets, quantity + 1))}
          disabled={disabled || quantity >= maxTickets}
          className="
            w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600
            flex items-center justify-center
            hover:bg-gray-100 dark:hover:bg-gray-700
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <Plus size={14} />
        </button>
      </div>

      {quantity > 1 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {quantity} tickets · 1 person per ticket
        </p>
      )}
    </div>
  );
}

// ── Price summary box ──────────────────────────────────────────────────────────
function PriceSummary({
  unitPrice,
  ticketQty,
  processingFee,
  currency,
}: {
  unitPrice: number;
  ticketQty: number;
  processingFee: number;
  currency: string;
}) {
  const subtotal = unitPrice * ticketQty;
  const total    = subtotal + processingFee;

  return (
    <div className="w-full space-y-2">

      {/* Per ticket line */}
      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>Price per ticket</span>
        <span>{currency} {unitPrice.toFixed(2)}</span>
      </div>

      {/* Quantity line — only shown when more than 1 */}
      {ticketQty > 1 && (
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>× {ticketQty} tickets</span>
          <span>{currency} {subtotal.toFixed(2)}</span>
        </div>
      )}

      {/* Processing fee line */}
      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          Processing fee
          <span
            title={`A flat ${currency} ${processingFee.toFixed(2)} fee is added to cover payment processing costs.`}
            className="cursor-help"
          >
            <Info size={13} className="text-gray-400" />
          </span>
        </span>
        <span>{currency} {processingFee.toFixed(2)}</span>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span className="text-[#5871A7]">
            {currency} {total.toFixed(2)}
          </span>
        </div>
      </div>

    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SubscriptionPage() {
  const [billingMode, setBillingMode]   = useState<'yearly' | 'singlepayment'>('yearly');
  const [currentPlan, setCurrentPlan]   = useState<string | null>(null);
  const [username, setUsername]         = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // ── Ticket quantity ──────────────────────────────────────────────────────────
  const [ticketQty, setTicketQty] = useState<number>(1);

  // ── Signup form ──────────────────────────────────────────────────────────────
  const [signupUsername, setSignupUsername] = useState<string>("");
  const [signupPassword, setSignupPassword] = useState<string>("");

  const params       = useParams();
  const searchParams = useSearchParams();

  let awardId = params?.id;
  if (!awardId) {
    awardId = searchParams.get('id') || 'notfound';
  }

  const billingname = "Single Payment";
  const price       = "$49.99";

  const [currentName,     setCurrentName]     = useState<string | null>(null);
  const [currentPrice,    setCurrentPrice]    = useState<string | null>(null);
  const [currentCurrency, setCurrentCurrency] = useState<string | null>(null);
  const [currentActive,   setCurrentActive]   = useState<string | null>(null);
  const [currentFee,   setCurrentFee]   = useState<string | null>(null);

  // ── Auth check ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      setIsAuthenticated(true);
    }
  }, []);

  // ── Fetch subscription type ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/getsubscriptiontype/${awardId}`) 
      .then((res) => res.json())
      .then((data) => {
        setCurrentName(data.billingname);
        setCurrentPrice(data.price);
        setCurrentCurrency(data.currency);
        setCurrentActive(data.billingactive);
        setCurrentFee(data.fee);
      })
      .catch((err) => {
        console.error("Error fetching subscription:", err);
        setCurrentPlan('freemium');
      });
  }, [awardId]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const processingFee  = parseFloat(String(currentFee ?? PROCESSING_FEE)) || PROCESSING_FEE;
  const unitPrice     = parseFloat(currentPrice || "9.99") || 0;
  const subtotal      = unitPrice * ticketQty;
  const totalPrice     = subtotal + processingFee;
  const currencyUpper = currentCurrency?.toUpperCase() ?? "USD";

  const plans: Plan[] = [
    {
      id:        currentName || billingname,
      name:      currentName || billingname,
      badge:     'Drop access',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      features: [
        // { text: 'This pass/ticket gives one person access to this event' },
        { text: 'Download the drop pass(es)/ticket(s) to your mobile wallet' }
      ],
      price: currentPrice || price,
    },
  ];

  // ── Checkout session helper ───────────────────────────────────────────────────
  const createCheckoutSession = async (userid: string, tier: string) => {
    const formData = {
      userid,
      awardid:       awardId,
      tier,
      quantity:      ticketQty,
      // Pass the total so the backend can verify / create the correct line items
      totalAmount:   totalPrice.toFixed(2),
      processingFee: processingFee.toFixed(2),
      successurl: `https://${process.env.NEXT_PUBLIC_DNSPREFIX}.geo-drops.com/dashboard/award-details/${awardId}`,
      cancelurl:  `https://${process.env.NEXT_PUBLIC_DNSPREFIX}.geo-drops.com/dashboard/award-details/${awardId}`,
    };

    const res  = await fetch(`${API_URL}/singlepayment/create-checkout-session`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(formData),
    });
    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error(data.error || "Error creating payment session");
      setIsProcessing(false);
    }
  };

  // ── Signup + pay (unauthenticated) ────────────────────────────────────────────
  const handleSignupAndPay = async (tier: string) => {
    if (!signupUsername || !signupPassword) {
      toast.error("Please enter both username and password");
      return;
    }

    setIsProcessing(true);

    try {
      // Try signup
      const signupRes  = await fetch(`${API_URL}/signupmobile`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          fullname: signupUsername,
          username: signupUsername,
          password: signupPassword,
        }),
      });
      const signupData = await signupRes.json();

      // Fall back to login if signup fails
      if (!signupRes.ok || !signupData.success) {
        const loginRes  = await fetch(`${API_URL}/loginmobile`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ username: signupUsername, password: signupPassword }),
        });
        const loginData = await loginRes.json();

        if (!loginRes.ok || !loginData.success) {
          toast.error(
            signupData.message ||
            loginData.message ||
            "Signup failed. Please check your credentials and try again."
          );
          setIsProcessing(false);
          return;
        }
      }

      localStorage.setItem("username", signupUsername);
      setUsername(signupUsername);
      setIsAuthenticated(true);

      await createCheckoutSession(signupUsername, tier);
    } catch (error) {
      console.error("Error during signup and payment:", error);
      toast.error("An error occurred. Please try again.");
      setIsProcessing(false);
    }
  };

  // ── Pay (authenticated) ───────────────────────────────────────────────────────
  const selectPlan = async (tier: string) => {
    if (!username) {
      toast.error("User not logged in");
      return;
    }
    if (tier === 'freemium') {
      toast.success("You are now on the free plan!");
      return;
    }

    setIsProcessing(true);

    try {
      await createCheckoutSession(username, tier);
    } catch (error) {
      console.error("Error selecting plan:", error);
      toast.error("Failed to process payment. Please try again.");
      setIsProcessing(false);
    }
  };

  const isCurrentPlan = (planId: string): boolean => {
    if (!currentPlan) return false;
    if (planId.includes('singlepayment') || planId.includes('yearly')) {
      return currentPlan.toLowerCase().includes(
        planId.replace('singlepayment', '').replace('yearly', '').toLowerCase()
      );
    }
    return currentPlan.toLowerCase() === planId.toLowerCase();
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 lg:w-[95%] py-8">

      {/* Logo */}
      <div className="flex justify-center mb-4">
        <Image
          src={process.env.NEXT_PUBLIC_LOGO_PATH || logo}
          alt="Logo"
          width={100}
          height={100}
        />
      </div>

      {/* Title */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-center flex-1">
          Buy your drop ticket/pass
        </h1>
      </div>

      {/* Logged-in banner */}
      {isAuthenticated && (
        <p className="text-center text-lg text-[#61667A] dark:text-gray-400">
          Logged in as:{" "}
          <span className="font-medium">{username}</span>
        </p>
      )}

      {/* Back button */}
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={() =>
            window.open(
              isAuthenticated
                ? `/dashboard/award-details/${awardId}`
                : `/award-details/${awardId}/public`,
              '_self'
            )
          }
        >
          Back to the Drop
        </Button>
      </div>

      {/* ── Pricing card ────────────────────────────────────────────────────── */}
      <div className="flex justify-center mt-4 w-full max-w-md px-4 mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white dark:bg-[#1C2541] rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 p-6 flex flex-col w-full gap-6"
          >
            {/* Plan header */}
            <div className="text-center">
              <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
                {plan.name}
                {isCurrentPlan(plan.id) && (
                  <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                    Current Plan
                  </span>
                )}
              </h3>
            </div>

            {/* Features */}
            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* ── Ticket stepper + price summary ───────────────────────────── */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5 flex flex-col items-center gap-5">
              <TicketStepper
                quantity={ticketQty}
                onChange={setTicketQty}
                disabled={isProcessing}
                maxTickets={10}
              />

              <div className="w-full border-t border-gray-200 dark:border-gray-700 pt-4">
                <PriceSummary
                  unitPrice={unitPrice}
                  ticketQty={ticketQty}
                  processingFee={processingFee}
                  currency={currencyUpper}
                />
              </div>
            </div>

            {/* ── Signup form (unauthenticated) ───────────────────────────── */}
            {!isAuthenticated && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-4">
                <h4 className="text-sm font-semibold text-center">
                  Sign up / in to continue
                </h4>

                <div>
                  <Label htmlFor="signup-username" className="text-sm mb-2 block">
                    Username (Email)
                  </Label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <Input
                      id="signup-username"
                      type="email"
                      autoComplete="email"
                      required
                      className="pl-10"
                      placeholder="your.email@example.com"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="signup-password" className="text-sm mb-2 block">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <Input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="pl-10"
                      placeholder="Type in a password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Pay button ───────────────────────────────────────────────── */}
            <div className="mt-auto">
              {plan.isFree ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    isAuthenticated
                      ? selectPlan('freemium')
                      : handleSignupAndPay('freemium')
                  }
                  disabled={isCurrentPlan('freemium') || isProcessing}
                >
                  {isCurrentPlan('freemium') ? 'Current Plan' : 'Subscribe (Free)'}
                </Button>
              ) : isAuthenticated ? (
                <Button
                  className="w-full bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white"
                  onClick={() => selectPlan(`${plan.id}singlepayment`)}
                  disabled={isCurrentPlan(`${plan.id}singlepayment`) || isProcessing}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <Spinner />
                      Processing...
                    </span>
                  ) : isCurrentPlan(`${plan.id}singlepayment`) ? (
                    'Current Plan'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Ticket size={16} />
                      Pay {currencyUpper} {totalPrice.toFixed(2)}
                      {ticketQty > 1 && (
                        <span className="text-white/70 text-xs">
                          ({ticketQty} tickets)
                        </span>
                      )}
                    </span>
                  )}
                </Button>
              ) : (
                <Button
                  className="w-full bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white"
                  onClick={() => handleSignupAndPay(`${plan.id}singlepayment`)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <Spinner />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Ticket size={16} />
                      Sign Up/In & Pay {currencyUpper} {totalPrice.toFixed(2)}
                      {ticketQty > 1 && (
                        <span className="text-white/70 text-xs">
                          ({ticketQty} tickets)
                        </span>
                      )}
                    </span>
                  )}
                </Button>
              )}
            </div>

            {/* Already have an account */}
            {!isAuthenticated && (
              <p className="text-center text-xs text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <a
                  href={`/signin?id=${awardId}&tf=1`}
                  className="font-medium text-clgeodrops hover:opacity-80"
                >
                  Log in
                </a>
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-[#61667A] dark:text-gray-400 mt-8 space-y-2">
        <p>All payments are processed securely through Stripe.</p>
        <p>
          Contact{" "}
          <span className="font-medium">support@ega-tech.co</span>{" "}
          for refunds as that cannot be done here.
        </p>
      </div>

    </div>
  );
}