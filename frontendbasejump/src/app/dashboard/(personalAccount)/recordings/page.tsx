import { RecordingsTable } from "@/components/dashboard/RecordingsTable";
import { getRecordings } from "@/lib/actions/recordings";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Recordings",
};

export default async function RecordingsPage() {
  const supabase = createClient();
  const { data: personalAccount, error: accountError } = await supabase.rpc(
    "get_personal_account"
  );

  if (accountError || !personalAccount) {
    console.error(
      "Error fetching personal account or account not found:",
      accountError
    );
    // Redirect to login or an error page if personal account can't be fetched
    redirect("/login"); 
  }

  const recordings = await getRecordings(personalAccount.account_id);

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