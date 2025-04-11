import AcceptTeamInvitation from "@/components/basejump/accept-team-invitation";
import { redirect } from "next/navigation"

export default async function AcceptInvitationPage({searchParams}: {searchParams: {token?: string}}) {

    if (!searchParams.token) {
       redirect("/");
    }

    return (
        <div className="max-w-md mx-auto w-full my-12">
            <AcceptTeamInvitation token={searchParams.token} />
        </div>
    )
}