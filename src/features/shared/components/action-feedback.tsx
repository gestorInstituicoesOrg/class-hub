import type { ActionState } from "@/lib/actions/state";

export function ActionFeedback({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p className="rounded-xl bg-absent/10 px-4 py-3 text-sm text-absent" role="alert">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="rounded-xl bg-soft-blue px-4 py-3 text-sm text-primary" role="status">
        {state.success}
      </p>
    );
  }

  return null;
}
