import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PersonalDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get the current user via Supabase
  const supabaseClient = createClient();
  const { data: { user } } = await supabaseClient.auth.getUser();
  
  // Redirect if not logged in
  if (!user) {
    redirect("/login");
  }
  
  // Get the personal account details
  const { data: personalAccount } = await supabaseClient.rpc('get_personal_account');

  // Define the navigation items for our agent-based UI
  const navigation = [
    {
      name: "Home",
      href: "/dashboard",
    },
    {
      name: "Agents",
      href: "/dashboard/agents",
    },
    {
      name: "Devices",
      href: "/dashboard/devices",
    },
    {
      name: "Data",
      href: "/dashboard/data",
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
    },
  ];

  // Right panel content
  const rightPanelContent = (
    <div className="flex flex-col gap-4">
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium mb-2">Account Status</h3>
        <p className="text-sm text-muted-foreground">Active</p>
      </div>
      <div className="p-4 border rounded-lg">
        <h3 className="font-medium mb-2">Recent Activity</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span>Login</span>
            <span className="text-muted-foreground">1 hour ago</span>
          </li>
          <li className="flex items-center justify-between">
            <span>Settings updated</span>
            <span className="text-muted-foreground">3 days ago</span>
          </li>
        </ul>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      navigation={navigation}
      accountId={personalAccount?.account_id || user.id}
      userName={personalAccount?.name || user.email?.split("@")[0] || "User"}
      userEmail={personalAccount?.email || user.email}
      rightPanelContent={rightPanelContent}
      rightPanelTitle="Account Details"
    >
      {children}
    </DashboardLayout>
  );
}