import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { createClient } from "@/lib/supabase/server";
import { Table, TableRow, TableBody, TableCell } from "../ui/table";
import { Badge } from "../ui/badge";
import CreateTeamInvitationButton from "./create-team-invitation-button";
import { formatDistanceToNow } from "date-fns";
import DeleteTeamInvitationButton from "./delete-team-invitation-button";

type Props = {
    accountId: string;
}

export default async function ManageTeamInvitations({ accountId }: Props) {
    const supabaseClient = createClient();

    const { data: invitations } = await supabaseClient.rpc('get_account_invitations', {
        account_id: accountId
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <div></div>
                <CreateTeamInvitationButton accountId={accountId} />
            </div>
            
            {Boolean(invitations?.length) ? (
                <Table>
                    <TableBody>
                        {invitations?.map((invitation: any) => (
                            <TableRow key={invitation.invitation_id} className="hover:bg-hover-bg dark:hover:bg-hover-bg-dark border-subtle dark:border-white/10">
                                <TableCell>
                                    <div className="flex items-center gap-x-2">
                                        <span className="text-card-title font-medium">{invitation.invitation_email || "Email invitation"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-x-2">
                                        <Badge variant="outline" className="text-foreground/70 border-subtle dark:border-white/10">
                                            {formatDistanceToNow(invitation.created_at, { addSuffix: true })}
                                        </Badge>
                                        <Badge 
                                            variant={invitation.invitation_type === '24_hour' ? 'default' : 'outline'} 
                                            className={invitation.invitation_type === '24_hour' ? 'bg-accent hover:bg-accent/90' : 'text-foreground/70 border-subtle dark:border-white/10'}
                                        >
                                            {invitation.invitation_type}
                                        </Badge>
                                        <Badge 
                                            variant={invitation.account_role === 'owner' ? 'default' : 'outline'} 
                                            className={invitation.account_role === 'owner' ? 'bg-primary hover:bg-primary/90' : 'text-foreground/70 border-subtle dark:border-white/10'}
                                        >
                                            {invitation.account_role}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DeleteTeamInvitationButton invitationId={invitation.invitation_id} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-6 text-muted-foreground">
                    No pending invitations. Use the "Invite" button to add team members.
                </div>
            )}
        </div>
    )
}
