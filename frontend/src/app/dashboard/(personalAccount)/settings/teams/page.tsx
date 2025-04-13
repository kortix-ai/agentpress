import ManageTeams from "@/components/basejump/manage-teams";

export default async function PersonalAccountTeamsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-card-title">Teams</h3>
                <p className="text-sm text-foreground/70">
                    Manage your teams and team memberships.
                </p>
            </div>
            
            <ManageTeams />
        </div>
    )
}