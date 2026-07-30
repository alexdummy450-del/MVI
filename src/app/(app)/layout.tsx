import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, title, station")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-forest-100 bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold text-forest-800">
              MVI Tracker
            </span>
            <span className="id-tag hidden text-forest-400 sm:inline">
              ACCIDENT · INSPECTION · REPORT
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/dashboard" className="btn-ghost">
              Dashboard
            </Link>
            <Link href="/accidents/new" className="btn-primary">
              + New accident
            </Link>
            <div className="ml-3 flex items-center gap-3 border-l border-forest-100 pl-3">
              <div className="text-right leading-tight">
                <p className="text-sm font-medium text-ink">{profile?.full_name ?? user.email}</p>
                <p className="text-xs text-forest-400">{profile?.station ?? "—"}</p>
              </div>
              <SignOutButton />
            </div>
          </nav>
        </div>
        <div className="dash-divider" />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
