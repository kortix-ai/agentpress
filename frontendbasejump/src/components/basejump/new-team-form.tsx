import { Input } from "@/components/ui/input"
import { SubmitButton } from "../ui/submit-button"
import { createTeam } from "@/lib/actions/teams";
import { Label } from "../ui/label";

export default function NewTeamForm() {


    return (
        <form className="animate-in flex-1 flex flex-col w-full justify-center gap-y-6 text-foreground">
            <div className="flex flex-col gap-y-2">
                <Label htmlFor="email">
                    Team Name
                </Label>
                <Input
                    name="name"
                    placeholder="My Team"
                    required
                />
            </div>
            <div className="flex flex-col gap-y-2">
                <Label htmlFor="password">
                    Identifier
                </Label>
                <div className="flex items-center gap-x-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap grow">
                        https://your-app.com/
                    </span>
                    <Input
                        name="slug"
                        placeholder="my-team"
                        required
                    />
                </div>
            </div>
            <SubmitButton
                formAction={createTeam}
                pendingText="Creating..."
            >
                Create team
            </SubmitButton>
        </form>
    )
}
