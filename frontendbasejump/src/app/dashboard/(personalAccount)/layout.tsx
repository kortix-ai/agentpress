import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface PersonalAccountLayoutProps {
  children: React.ReactNode;
}

export default async function PersonalAccountLayout({
  children,
}: PersonalAccountLayoutProps) {
  // Get the current user via Supabase
  const supabaseClient = createClient();
  const { data: { user } } = await supabaseClient.auth.getUser();
  
  // Redirect if not logged in
  if (!user) {
    redirect("/login");
  }
  
  // Get the personal account details
  const { data: personalAccount } = await supabaseClient.rpc('get_personal_account');

  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Agents", href: "/dashboard/agents" },
    { name: "Settings", href: "/dashboard/settings" },
  ];

  return (
    <DashboardLayout
      navigation={navigation}
      accountId={personalAccount?.account_id || user.id}
      userName={user?.user_metadata?.name || user.email?.split('@')[0] || 'User'}
      userEmail={user.email}
      rightPanelTitle="Suna's Computer"
    >
      {children}
    </DashboardLayout>
  );
}