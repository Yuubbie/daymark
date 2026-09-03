import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Spinner, Button } from "./ui";
import SubscriptionPayment from "./SubscriptionPayment";
import type { Role } from "../lib/types";

type SchoolSubscription = {
  trial_ends_at: string | null;
  paid_until: string | null;
  subscription_status: string | null;
};

// Access is active if EITHER the paid period or the trial period is still
// in the future. We check the dates directly rather than trusting
// subscription_status alone, since that text field is a secondary signal
// set by the Edge Function -- the dates are the source of truth.
function isExpired(school: SchoolSubscription): boolean {
  const now = new Date();
  if (school.paid_until && new Date(school.paid_until) > now) return false;
  if (school.trial_ends_at && new Date(school.trial_ends_at) > now) return false;
  return true;
}

type Props = {
  schoolId: string;
  role: Role;
  schoolEmail: string;
  children: React.ReactNode;
};

export default function SubscriptionGate({ schoolId, role, schoolEmail, children }: Props) {
  const [status, setStatus] = useState<"loading" | "active" | "expired">("loading");

  const checkStatus = useCallback(async () => {
    setStatus("loading");
    const { data, error } = await supabase
      .from("schools")
      .select("trial_ends_at, paid_until, subscription_status")
      .eq("id", schoolId)
      .single();

    if (error || !data) {
      // Fail OPEN, not closed: if we can't reach the database to check,
      // locking every user in the school out of the whole app is a worse
      // outcome than temporarily letting an expired school through. Log it
      // so a real outage or bug still gets noticed and investigated.
      console.error("SubscriptionGate: failed to load subscription status", error);
      setStatus("active");
      return;
    }

    setStatus(isExpired(data) ? "expired" : "active");
  }, [schoolId]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  if (status === "loading") return <Spinner />;
  if (status === "active") return <>{children}</>;

  // Expired: what's shown depends on who's looking. Only the school admin
  // is meant to see or use the payment screen.
  if (role !== "admin") {
    return <BlockedForNonAdmin />;
  }

  return (
    <SubscriptionPayment
      schoolId={schoolId}
      schoolEmail={schoolEmail}
      onPaymentVerified={() => void checkStatus()}
    />
  );
}

function BlockedForNonAdmin() {
  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-[440px]">
        <span className="eyebrow">Subscription needed</span>
        <h1 className="text-[26px] mt-1.5">
          Your school's subscription needs to be renewed.
        </h1>
        <p className="mt-3 text-[14px] text-ink-soft leading-relaxed">
          Please contact your school administrator to renew Daymark's
          subscription. Access will resume automatically once payment is
          confirmed.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Check again
          </Button>
        </div>
      </div>
    </div>
  );
}
