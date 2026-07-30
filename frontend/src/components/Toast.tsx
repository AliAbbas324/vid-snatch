import { CheckCircle, XCircle } from "@phosphor-icons/react";

export interface ToastState {
  text: string;
  kind: "success" | "error";
}

export function Toast({ toast }: { toast: ToastState | null }) {
  return (
    <div
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border-strong bg-surface-3 px-5.5 py-3.5 font-mono text-base text-ink shadow-lg transition-all duration-200 ${
        toast ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      {toast?.kind === "error" ? (
        <XCircle size={19} weight="fill" className="text-danger" />
      ) : (
        <CheckCircle size={19} weight="fill" className="text-success" />
      )}
      {toast?.text}
    </div>
  );
}
