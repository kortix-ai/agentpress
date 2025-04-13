import { RecordingsTable } from "@/components/dashboard/RecordingsTable";
import { getRecordings } from "@/lib/actions/recordings";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Recordings",
};

export default async function RecordingsPage({
  params: { accountSlug },
}: {
  params: { accountSlug: string };
}) {
  const supabase = createClient();
  const { data: account, error: accountError } = await supabase.rpc(
    "get_account_by_slug",
    {
      slug: accountSlug,
    }
  );

  if (accountError || !account) {
    console.error("Error fetching account or account not found:", accountError);
    // Redirect to a safe page, e.g., the main dashboard
    redirect("/dashboard");
  }

  const recordings = await getRecordings(account.account_id);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Recordings</h3>
        <p className="text-sm text-muted-foreground">
          View and manage your recording sessions
        </p>
      </div>
      <RecordingsTable recordings={recordings} />
    </div>
  );
} 