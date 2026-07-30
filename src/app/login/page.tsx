import { LoginForm } from "@/components/login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-forest-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="id-tag text-forest-200">MVI // ACCIDENT TRACKER</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-white">
            Motor Vehicle Inspection Unit
          </h1>
        </div>
        <div className="card p-6">
          <LoginForm redirectTo={searchParams.redirectTo} />
          {searchParams.error && (
            <p className="mt-3 text-sm text-rust-500">{searchParams.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
