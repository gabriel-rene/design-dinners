import { requireAdmin } from "@/lib/auth";
import { buildMembersCsv } from "@/lib/community";
import { listMembers } from "@/lib/community-db";
import { getDb, hasDatabaseConfig } from "@/lib/db";

export async function GET() {
  await requireAdmin();
  const rows = hasDatabaseConfig ? await listMembers(getDb()) : [];
  return new Response(buildMembersCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="comunidad-whatsapp.csv"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
