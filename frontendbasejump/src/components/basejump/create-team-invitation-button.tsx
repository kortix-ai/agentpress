'use client'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import NewInvitationForm from "./new-invitation-form"

type Props = {
    accountId: string
}

export default function CreateTeamInvitationButton({accountId}: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Invite new member</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a new invitation</DialogTitle>
          <DialogDescription>
            Invitation links can be given to anyone to join your team
          </DialogDescription>
        </DialogHeader>
        <NewInvitationForm accountId={accountId} />
      </DialogContent>
    </Dialog>
  )
}
