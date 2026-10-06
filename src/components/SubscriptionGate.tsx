import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Spinner, Button } from "./ui";
import SubscriptionPayment from "./SubscriptionPayment";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/types";

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

    const { data, error } = await supabase.rpc("school_subscription_ok");
    if (!error && typeof data === "boolean") {
      setStatus(data ? "active" : "expired");
      return;
    }

    const missingRpc = !!error && /could not find the function|does not exist/i.test(error.message);
    if (!missingRpc) {
      console.error("SubscriptionGate: failed to load subscription status", error);
      setStatus("expired");
      return;
    }

    const { data: school, error: schoolErr } = await supabase
      .from("schools")
      .select("subscription_status")
      .eq("id", schoolId)
      .single();

    if (schoolErr || !school) {
      console.error("SubscriptionGate: failed to load subscription status", schoolErr);
      setStatus("expired");
      return;
    }

    const s = school.subscription_status as string;
    setStatus(s === "lapsed" || s === "cancelled" || s === "past_due" ? "expired" : "active");
  }, [schoolId]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  if (status === "loading") return <Spinner />;
  if (status === "active") return <>{children}</>;

  if (role !== "admin" && role !== "proprietor") {
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
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-[440px]">
        <span className="eyebrow">Subscription needed</span>
        <h1 className="text-[26px] mt-1.5">
          Your school's subscription needs to be renewed.
        </h1>
        <p className="mt-3 text-[14px] text-ink-soft leading-relaxed">
          Please contact your school administrator to renew Daymaark's
          subscription. Access will resume automatically once payment is
          confirmed.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Check again
          </Button>
          <Button
            variant="secondary"
            onClick={() => void signOut().then(() => navigate("/login", { replace: true }))}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
