"use client"

import { useFormState } from "react-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createTeam } from "@/lib/actions/teams";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState = {
    message: "",
};

export default function NewTeamForm() {
    const [state, formAction] = useFormState(createTeam, initialState);

    return (
        <form className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground/90">
                    Team Name
                </Label>
                <Input
                    id="name"
                    name="name"
                    placeholder="Enter team name"
                    className="h-10 rounded-lg border-subtle dark:border-white/10 bg-white dark:bg-background-secondary"
                    required
                />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-medium text-foreground/90">
                    Team URL
                </Label>
                <div className="flex items-center gap-x-2">
                    <span className="text-sm text-foreground/60 whitespace-nowrap">
                        your-app.com/
                    </span>
                    <Input
                        id="slug"
                        name="slug"
                        placeholder="my-team"
                        className="h-10 rounded-lg border-subtle dark:border-white/10 bg-white dark:bg-background-secondary"
                        required
                    />
                </div>
            </div>
            
            {state?.message && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded-lg border border-red-100 dark:border-red-900/20">
                    {state.message}
                </div>
            )}
            
            <SubmitButton
                formAction={formAction}
                pendingText="Creating team..."
                className="w-full rounded-lg bg-primary hover:bg-primary/90 text-white"
            >
                Create Team
            </SubmitButton>
        </form>
    );
}
