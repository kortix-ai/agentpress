import { createClient } from "@/lib/supabase/server";
import { Recording } from "@/components/dashboard/RecordingsTable";

export async function getRecordings(accountId: string): Promise<Recording[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("recordings")
    .select("id, name, created_at, meta, device:devices(name)")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching recordings:", error);
    throw error;
  }

  const formattedData: Recording[] = data?.map(rec => {
    const anyRec = rec as any;
    return {
      id: anyRec.id,
      name: anyRec.name,
      created_at: anyRec.created_at,
      meta: anyRec.meta,
      devices: anyRec.device ? { name: anyRec.device.name } : { name: null },
    };
  }) || [];

  return formattedData;
} 