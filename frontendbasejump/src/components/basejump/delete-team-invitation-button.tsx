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
import { useState } from "react"
import { Trash } from "lucide-react"
import { SubmitButton } from "../ui/submit-button"
import { deleteInvitation } from "@/lib/actions/invitations"
import { usePathname } from "next/navigation"

type Props = {
    invitationId: string
}

export default function DeleteTeamInvitationButton({invitationId}: Props) {
    const [open, setOpen] = useState(false)
    const returnPath = usePathname();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost"><Trash className="text-red-600 w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cancel pending invitation</DialogTitle>
          <DialogDescription>
            Are you sure? This cannot be undone
          </DialogDescription>
        </DialogHeader>
        <form>
            <input type="hidden" name="invitationId" value={invitationId} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <SubmitButton variant="destructive" formAction={deleteInvitation} pendingText="Cancelling...">
                Cancel invitation
            </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  )
}
