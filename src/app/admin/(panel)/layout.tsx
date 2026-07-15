import type { Metadata } from "next";

import AdminNav from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Panel de administración — Design Dinners",
};

// Authenticated area. This `(panel)` route group exists so the gate lives in
// one layout that wraps the dashboard and the three CRUD sections — but NOT
// `/admin/login` or `/admin/no-autorizado`, which sit outside the group and
// must stay reachable without a session (gating them here would loop the
// redirect back onto login). Every page inside still calls `requireAdmin()`
// itself; this layout gate is defense in depth, not a substitute.
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-dd-cream">
      <AdminNav email={user.email ?? ""} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 md:px-8 md:py-12">
        {children}
      </main>
    </div>
  );
}
