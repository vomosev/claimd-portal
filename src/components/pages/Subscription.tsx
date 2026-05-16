// src/components/page/Subscription.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Check } from "lucide-react";

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY || "pk_live_kCkZDH2dpISTB7lLUfVAaiPy";

interface PlanFeature {
  text: string;
}

interface Plan {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  features: PlanFeature[];
  monthlyPrice?: string;
  yearlyPrice?: string;
  isFree?: boolean;
}

export default function SubscriptionPage() {
  const [billingMode, setBillingMode] = useState<'yearly' | 'monthly'>('yearly');
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");

  // Handle localStorage access safely - FIXED
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  // Fetch current user's plan - FIXED: now depends on username state
  useEffect(() => {
    if (username) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/getsubscription/${username}/${process.env.NEXT_PUBLIC_WORLDID}`)
        .then((res) => res.json())
        .then((data) => {
          setCurrentPlan(data.plan || 'freemium');
        })
        .catch((err) => {
          console.error("Error fetching subscription:", err);
          setCurrentPlan('freemium');
        });
    }
  }, [username]); // Added username as dependency

  const plans: Plan[] = [
    {
      id: 'freemium',
      name: 'Freemium',
      badge: 'Limited access',
      badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      features: [
        { text: 'Limited drops' },
        { text: 'Automated event updates and messaging' }
      ],
      isFree: true
    },
    {
      id: 'membership001',
      name: 'MEMBERSHIP-001',
      badge: 'All access',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      features: [
        { text: 'Access drops' },
        { text: 'Access events' },
        { text: '9am-5pm GMT (UK) hours tech support' },
        { text: 'Usage analytics and reporting dashboards' },
        { text: 'Automated event updates and messaging' }
      ],
      monthlyPrice: '£14.99 / month',
      yearlyPrice: '£149 / year'
    },
    {
      id: 'membership002',
      name: 'MEMBERSHIP-002',
      badge: 'All access',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      features: [
        { text: 'Access drops' },
        { text: 'Access events' },
        { text: '9am-5pm GMT (UK) hours tech support' },
        { text: 'Usage analytics and reporting dashboards' },
        { text: 'Automated event updates and messaging' }
      ],
      monthlyPrice: '£24.99 / month',
      yearlyPrice: '£249.00 / year'
    }
  ];

  const toggleBilling = (mode: 'yearly' | 'monthly') => {
    setBillingMode(mode);
  };

  const selectPlan = async (tier: string) => {
    // FIXED: Use username state instead of storedUsername
    if (!username) {
      toast.error("User not logged in");
      return;
    }

    if (tier === 'freemium') {
      toast.success("You are now on the free plan!");
      return;
    }

    try {
      const formData = {
        userid: username, // FIXED: Use username state
        worldid: process.env.NEXT_PUBLIC_WORLDID,
        tier: tier,
        successurl: process.env.NEXT_PUBLIC_SUB_URL,
        cancelurl: process.env.NEXT_PUBLIC_SUB_URL
      };

      console.log('Sending subscription request:', formData); // Debug log

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/create-checkout-usersession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Error creating session");
      }
    } catch (error) {
      console.error("Error selecting plan:", error);
      toast.error("Failed to process subscription. Please try again.");
    }
  };

  const isCurrentPlan = (planId: string): boolean => {
    if (!currentPlan) return false;
    
    // Handle both monthly and yearly variants
    if (planId.includes('monthly') || planId.includes('yearly')) {
      return currentPlan.toLowerCase().includes(planId.replace('monthly', '').replace('yearly', '').toLowerCase());
    }
    
    return currentPlan.toLowerCase() === planId.toLowerCase();
  };

  return (
    <div className="space-y-8 lg:w-[95%] py-8">
      <h1 className="text-xl md:text-3xl font-semibold text-center">Choose Your Geo-Drops Subscription</h1>
      
      <p className="text-center text-lg text-[#61667A] dark:text-gray-400">
        Contact support for downgrades/custom pricing as that cannot be done here.
      </p>

      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => window.open('/dashboard', '_self')}
        >
          Dashboard
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open('/dashboard/settings', '_self')}
        >
          Settings
        </Button>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          <Button
            variant={billingMode === 'yearly' ? 'default' : 'ghost'}
            onClick={() => toggleBilling('yearly')}
            className="rounded-md"
          >
            Yearly
          </Button>
          <Button
            variant={billingMode === 'monthly' ? 'default' : 'ghost'}
            onClick={() => toggleBilling('monthly')}
            className="rounded-md"
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white dark:bg-[#1C2541] rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 p-6 flex flex-col"
          >
            {/* Plan Header */}
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
                {plan.name}
                {isCurrentPlan(plan.id) && (
                  <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                    Current Plan
                  </span>
                )}
              </h3>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${plan.badgeColor}`}>
                {plan.badge}
              </span>
            </div>

            {/* Features List */}
            <div className="flex-grow mb-6">
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing Button */}
            <div className="mt-auto">
              {plan.isFree ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => selectPlan('freemium')}
                  disabled={isCurrentPlan('freemium')}
                >
                  {isCurrentPlan('freemium') ? 'Current Plan' : 'Subscribe (Free)'}
                </Button>
              ) : (
                <>
                  {billingMode === 'monthly' ? (
                    <Button
                      className="w-full bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white"
                      onClick={() => selectPlan(`${plan.id}monthly`)}
                      disabled={isCurrentPlan(`${plan.id}monthly`)}
                    >
                      {isCurrentPlan(`${plan.id}monthly`) ? 'Current Plan' : plan.monthlyPrice}
                    </Button>
                  ) : (
                    <Button
                      className="w-full bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white"
                      onClick={() => selectPlan(`${plan.id}yearly`)}
                      disabled={isCurrentPlan(`${plan.id}yearly`)}
                    >
                      {isCurrentPlan(`${plan.id}yearly`) ? 'Current Plan' : plan.yearlyPrice}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="text-center text-sm text-[#61667A] dark:text-gray-400 mt-8">
        <p>All subscriptions are processed securely through Stripe.</p>
        <p className="mt-2">You can cancel or modify your subscription at any time.</p>
      </div>
    </div>
  );
}