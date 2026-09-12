import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button, Panel, Stat, Alert, Spinner } from "./ui";

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
    const existing = document.querySelector(`script[src="${PAYSTACK_SCRIPT_SRC}"]`);
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

type Installment = {
  id: string;
  label: string;
  amountNaira: number; // after any student-specific override is applied
  sequenceOrder: number;
  paid: boolean;
};

type Props = {
  studentId: string;
  schoolId: string;
  term: string; // e.g. "First Term 2026/2027" -- caller already knows this
  parentEmail: string;
  studentName: string;
};

type Status = "loading" | "ready" | "no-fees-set" | "processing" | "verifying" | "error";

export default function FeePayment({ studentId, schoolId, term, parentEmail, studentName }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [subaccountCode, setSubaccountCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null);

  async function loadFees() {
    setStatus("loading");
    try {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("class_id")
        .eq("id", studentId)
        .single();
      if (studentError) throw studentError;

      const { data: feeStructure, error: structureError } = await supabase
        .from("fee_structures")
        .select("id")
        .eq("class_id", student.class_id)
        .eq("term", term)
        .maybeSingle();
      if (structureError) throw structureError;

      if (!feeStructure) {
        setStatus("no-fees-set");
        return;
      }

      const { data: rawInstallments, error: installmentsError } = await supabase
        .from("fee_installments")
        .select("id, label, amount_naira, sequence_order")
        .eq("fee_structure_id", feeStructure.id)
        .order("sequence_order", { ascending: true });
      if (installmentsError) throw installmentsError;

      const { data: overrides } = await supabase
        .from("student_fee_overrides")
        .select("fee_installment_id, override_amount_naira")
        .eq("student_id", studentId);

      const { data: paidRows } = await supabase
        .from("fee_payments")
        .select("fee_installment_id")
        .eq("student_id", studentId)
        .eq("status", "success");

      const overrideMap = new Map(
        (overrides ?? []).map((o) => [o.fee_installment_id, o.override_amount_naira])
      );
      const paidSet = new Set((paidRows ?? []).map((p) => p.fee_installment_id));

      const merged: Installment[] = (rawInstallments ?? []).map((inst) => ({
        id: inst.id,
        label: inst.label,
        amountNaira: overrideMap.get(inst.id) ?? inst.amount_naira,
        sequenceOrder: inst.sequence_order,
        paid: paidSet.has(inst.id),
      }));

      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("paystack_subaccount_code")
        .eq("id", schoolId)
        .single();
      if (schoolError) throw schoolError;

      setInstallments(merged);
      setSubaccountCode(school?.paystack_subaccount_code ?? null);
      await loadPaystackScript();
      setStatus("ready");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not load fee details");
      setStatus("error");
    }
  }

  useEffect(() => {
    void loadFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, schoolId, term]);

  async function handlePay(installment: Installment) {
    if (!window.PaystackPop) return;

    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      setErrorMessage("Payment is not configured (missing public key)");
      setStatus("error");
      return;
    }

    if (!subaccountCode) {
      setErrorMessage(
        "This school hasn't finished setting up fee collection yet. Please contact the school office."
      );
      setStatus("error");
      return;
    }

    setPayingInstallmentId(installment.id);
    setStatus("processing");

    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: parentEmail,
      amount: installment.amountNaira * 100, // kobo
      currency: "NGN",
      subaccount: subaccountCode, // this is what makes the money split to the school
      metadata: {
        student_id: studentId,
        fee_installment_id: installment.id,
      },
      callback: (response: { reference: string }) => {
        void verifyOnServer(response.reference, installment.id);
      },
      onClose: () => {
        setStatus("ready");
        setPayingInstallmentId(null);
      },
    });

    handler.openIframe();
  }

  async function verifyOnServer(reference: string, feeInstallmentId: string) {
    setStatus("verifying");
    try {
      const { data, error } = await supabase.functions.invoke("verify-fee-payment", {
        body: { reference, student_id: studentId, fee_installment_id: feeInstallmentId },
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error ?? "Payment could not be verified");
      }

      await loadFees(); // refresh so the paid installment now shows as paid
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Payment was received but verification failed — contact support before retrying."
      );
      setStatus("error");
    } finally {
      setPayingInstallmentId(null);
    }
  }

  if (status === "loading") {
    return <Spinner />;
  }

  if (status === "no-fees-set") {
    return (
      <div className="min-h-dvh bg-paper flex items-center justify-center px-6">
        <div className="w-full max-w-[440px]">
          <span className="eyebrow">Fees</span>
          <h1 className="text-[26px] mt-1.5">Nothing due yet</h1>
          <p className="mt-3 text-[14px] text-ink-soft leading-relaxed">
            {studentName}'s school hasn't set up fees for {term} yet. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  // Only the next unpaid installment, in order, can be paid -- matches how
  // schools actually expect fees to be paid (first instalment before second).
  const nextPayableId = installments.find((i) => !i.paid)?.id ?? null;

  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-[440px]">
        <span className="eyebrow">Fees</span>
        <h1 className="text-[26px] mt-1.5">{studentName}'s fees — {term}</h1>

        {status === "error" && errorMessage && (
          <div className="mt-5">
            <Alert>{errorMessage}</Alert>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {installments.map((installment) => {
            const isPayable = installment.id === nextPayableId;
            const isPaying = payingInstallmentId === installment.id;

            return (
              <Panel key={installment.id}>
                <div className="flex items-center justify-between">
                  <Stat
                    value={`₦${installment.amountNaira.toLocaleString("en-NG")}`}
                    label={installment.label}
                  />
                  {installment.paid ? (
                    <span className="text-[13px] font-semibold text-present">Paid</span>
                  ) : isPayable ? (
                    <Button
                      onClick={() => handlePay(installment)}
                      loading={isPaying && (status === "processing" || status === "verifying")}
                    >
                      {isPaying && status === "processing" && "Opening..."}
                      {isPaying && status === "verifying" && "Confirming..."}
                      {!isPaying && "Pay"}
                    </Button>
                  ) : (
                    <span className="text-[13px] text-ink-faint">Not yet due</span>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
