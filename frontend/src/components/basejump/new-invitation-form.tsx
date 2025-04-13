'use client'
import { SubmitButton } from "../ui/submit-button"
import { Label } from "../ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "@/components/ui/select";
import { createInvitation } from "@/lib/actions/invitations";
import { useFormState } from "react-dom";
import fullInvitationUrl from "@/lib/full-invitation-url";
import { Input } from "../ui/input";

type Props = {
    accountId: string
}

const invitationOptions = [
    { label: '24 Hour', value: '24_hour' },
    { label: 'One time use', value: 'one_time' },
]

const memberOptions = [
    { label: 'Owner', value: 'owner' },
    { label: 'Member', value: 'member' },
]

const initialState = {
    message: "",
    token: ""
};

export default function NewInvitationForm({ accountId }: Props) {
    const [state, formAction] = useFormState(createInvitation, initialState)

    return (
        <form className="animate-in flex-1 flex flex-col w-full justify-center gap-y-4 text-foreground mt-2">
            {Boolean(state?.token) ? (
                <div className="p-4 border border-subtle dark:border-white/10 rounded-lg bg-hover-bg dark:bg-hover-bg-dark">
                    <p className="text-sm font-medium mb-2 text-card-title">Invitation Link:</p>
                    <div className="text-sm break-all text-foreground/70 select-all">
                        {fullInvitationUrl(state.token!)}
                    </div>
                </div>
            ) : (
                <>
                    <input type="hidden" name="accountId" value={accountId} />
                    <div className="flex flex-col gap-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-foreground/90">
                            Email Address
                        </Label>
                        <Input
                            name="email"
                            id="email"
                            type="email"
                            placeholder="colleague@example.com"
                            required
                            className="h-10 rounded-lg border-subtle dark:border-white/10 bg-white dark:bg-background-secondary"
                        />
                    </div>
                    <div className="flex flex-col gap-y-2">
                        <Label htmlFor="invitationType" className="text-sm font-medium text-foreground/90">
                            Invitation Type
                        </Label>
                        <Select defaultValue="one_time" name="invitationType">
                            <SelectTrigger className="h-10 rounded-lg border-subtle dark:border-white/10 bg-white dark:bg-background-secondary">
                                <SelectValue placeholder="Invitation type" />
                            </SelectTrigger>
                            <SelectContent className="border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary">
                                {invitationOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-y-2">
                        <Label htmlFor="accountRole" className="text-sm font-medium text-foreground/90">
                            Team Role
                        </Label>
                        <Select defaultValue="member" name="accountRole">
                            <SelectTrigger className="h-10 rounded-lg border-subtle dark:border-white/10 bg-white dark:bg-background-secondary">
                                <SelectValue placeholder="Member type" />
                            </SelectTrigger>
                            <SelectContent className="border-subtle dark:border-white/10 bg-card-bg dark:bg-background-secondary">
                                {memberOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="mt-2">
                        <SubmitButton
                            formAction={async (prevState: any, formData: FormData) => formAction(formData)}
                            errorMessage={state?.message}
                            pendingText="Creating..."
                            className="w-full rounded-lg bg-primary hover:bg-primary/90 text-white h-10"
                        >
                            Send Invitation
                        </SubmitButton>
                    </div>
                </>
            )}
        </form>
    )
}
