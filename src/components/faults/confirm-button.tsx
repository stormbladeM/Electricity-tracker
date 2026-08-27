"use client";

import { useState } from "react";
import { Check, Users } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { useConfirmFault } from "./use-confirm-fault";

type ConfirmButtonProps = {
  faultId: string;
  hasConfirmed: boolean;
  /** The signed-in user reported this fault — they can't also confirm it. */
  isOwner: boolean;
  confirmCount: number;
  /** Called after a successful toggle so the parent can refetch. */
  onChange: () => void;
};

/**
 * "I'm affected too" — raises confirm_count, and at 3 the trigger promotes the
 * fault to confirmed. The reporter sees a plain count instead of the button:
 * filing the report is already their confirmation.
 */
export function ConfirmButton({
  faultId,
  hasConfirmed,
  isOwner,
  confirmCount,
  onChange,
}: ConfirmButtonProps) {
  const { user } = useAuth();
  const { setConfirmed, isPending } = useConfirmFault(faultId);
  const [message, setMessage] = useState<string | null>(null);

  if (isOwner) {
    return (
      <p className="flex items-center gap-1.5 text-14 text-text-muted">
        <Users aria-hidden="true" size={16} strokeWidth={1.5} />
        {confirmCount} {confirmCount === 1 ? "neighbour has" : "neighbours have"} confirmed this.
      </p>
    );
  }

  async function toggle() {
    if (!user) {
      setMessage("Not signed in yet. Try again in a moment.");
      return;
    }
    setMessage(null);
    const result = await setConfirmed(user.id, !hasConfirmed);
    if (result.ok) onChange();
    else setMessage(result.message);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={hasConfirmed}
        className={`flex items-center justify-center gap-2 rounded border px-4 py-3 text-16 font-medium transition-colors disabled:opacity-60 ${
          hasConfirmed
            ? "border-primary bg-primary/10 text-primary-text"
            : "border-hairline bg-surface text-text hover:border-text-muted"
        }`}
      >
        {hasConfirmed ? (
          <>
            <Check aria-hidden="true" size={16} strokeWidth={1.5} />
            You confirmed this
          </>
        ) : (
          "I'm affected too"
        )}
      </button>
      {message && (
        <p role="status" className="text-14 text-fault">
          {message}
        </p>
      )}
    </div>
  );
}
