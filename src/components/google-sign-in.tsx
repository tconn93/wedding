import { useState } from "react";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

const GOOGLE = GROK_PROVIDERS.find((provider) => provider.providerId === "grok-google");

export function GoogleSignIn({ callbackURL = "/" }: { callbackURL?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authEnabled || !GOOGLE) {
    return <p className="text-sm text-mist">Google sign-in is not available.</p>;
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(null);
          void signIn(GOOGLE.providerId, { callbackURL, errorCallbackURL: "/login" }).catch(
            (err: unknown) => {
              setPending(false);
              setError(err instanceof Error ? err.message : "Google sign-in didn’t start.");
            },
          );
        }}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-6 text-paper transition-[transform,background-color] duration-150 ease-out hover:bg-tide active:scale-[0.96] disabled:opacity-70"
      >
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
