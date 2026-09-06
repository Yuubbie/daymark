import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button, Panel, Stat, Alert, Spinner } from "./ui";

// --- Per-school pricing (Sep 2026 model change) ---
// Pricing is no longer computed from student count. Each school is charged
// its own set price, negotiated by the Daymaark team and stored directly on
// the schools row (schools.price_naira). If a school has no price set yet,
// this default minimum applies. Update a school's real price directly in
// the database — there is deliberately no pricing formula here anymore.
const DEFAULT_MINIMUM_PRICE_NAIRA = 200000;

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

const PAYSTACK_SCRIPT_SRC = "https://js.paystack.co/v1/inline.js";

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve();
      return;
    }
    const existing = document.querySelector(
      `script[src="${PAYSTACK_SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Paystack script failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = PAYSTACK_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Paystack script failed to load"));
    document.body.appendChild(script);
  });
}

type Props = {
  schoolId: string;
  schoolEmail: string; // used as the Paystack customer email
  onPaymentVerified: () => void; // parent (gate component) refetches subscription status and re-renders
};

type Status = "loading" | "ready" | "processing" | "verifying" | "error";

export default function SubscriptionPayment({
  schoolId,
  schoolEmail,
  onPaymentVerified,
}: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [priceNaira, setPriceNaira] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data, error } = await supabase
          .from("schools")
          .select("price_naira")
          .eq("id", schoolId)
          .single();

        if (error) throw error;
        if (cancelled) return;

        setPriceNaira(data?.price_naira ?? DEFAULT_MINIMUM_PRICE_NAIRA);
        await loadPaystackScript();
        if (cancelled) return;

        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error ? err.message : "Could not load payment details"
        );
        setStatus("error");
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  async function handlePay() {
    if (priceNaira === null || !window.PaystackPop) return;

    const amountNaira = priceNaira;
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

    if (!publicKey) {
      setErrorMessage("Payment is not configured (missing public key)");
      setStatus("error");
      return;
    }

    setStatus("processing");

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: schoolEmail,
      amount: amountNaira * 100, // Paystack expects kobo
      currency: "NGN",
      metadata: {
        school_id: schoolId,
      },
      callback: (response: { reference: string }) => {
        // The popup's "success" is just a trigger — the Edge Function is
        // what actually verifies and grants access. Never trust this alone.
        void verifyOnServer(response.reference);
      },
      onClose: () => {
        setStatus("ready");
      },
    });

    handler.openIframe();
  }

  async function verifyOnServer(reference: string) {
    setStatus("verifying");
    try {
      const { data, error } = await supabase.functions.invoke(
        "verify-paystack-payment",
        { body: { reference, school_id: schoolId } }
      );

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message ?? "Payment could not be verified");
      }

      onPaymentVerified();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Payment was received but verification failed — contact support before retrying."
      );
      setStatus("error");
    }
  }

  if (status === "loading") {
    return <Spinner />;
  }

  const amount = priceNaira ?? 0;

  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-[440px]">
        <span className="eyebrow">Subscription</span>
        <h1 className="text-[26px] mt-1.5">Continue using Daymaark</h1>
        <p className="mt-3 text-[14px] text-ink-soft leading-relaxed">
          Your school's trial or paid period has ended. Continue for this
          term.
        </p>

        {status === "error" && errorMessage && (
          <div className="mt-5">
            <Alert>{errorMessage}</Alert>
          </div>
        )}

        {priceNaira === null ? (
          <div className="mt-6">
            <Button full onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            <Panel className="mt-5">
              <div className="flex items-center justify-center">
                <Stat
                  value={`₦${amount.toLocaleString("en-NG")}`}
                  label="Due this term"
                />
              </div>
            </Panel>

            <div className="mt-6">
              <Button
                full
                onClick={handlePay}
                loading={status === "processing" || status === "verifying"}
              >
                {status === "processing" && "Opening payment window..."}
                {status === "verifying" && "Confirming payment..."}
                {(status === "ready" || status === "error") &&
                  `Pay ₦${amount.toLocaleString("en-NG")}`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
