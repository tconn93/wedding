import { Link, createFileRoute } from "@tanstack/react-router";
import { GoogleSignIn } from "@/components/google-sign-in";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const { user, isPending } = useCurrentUserState();

  return (
    <main className="grid min-h-svh place-items-center bg-sand px-5 text-ink">
      <div className="w-full max-w-sm">
        <p className="text-xs uppercase tracking-widest text-mist">April 10, 2027</p>
        <h1 className="mt-3 font-display text-5xl leading-none">Sign in</h1>
        <p className="mt-4 text-mist">
          Use your Google account. We don’t keep a password — Google confirms it’s you.
        </p>
        <div className="mt-8">
          {isPending ? (
            <div className="h-12 animate-pulse rounded-full bg-line" />
          ) : user ? (
            <div className="space-y-6">
              <p className="font-display text-2xl">You’re signed in.</p>
              <UserButton />
              <Link
                to="/"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-tide px-6 text-paper"
              >
                Back to the invitation
              </Link>
            </div>
          ) : (
            <GoogleSignIn callbackURL="/" />
          )}
        </div>
      </div>
    </main>
  );
}
