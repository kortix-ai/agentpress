'use client'

import {useRouter} from "next/navigation";
import AccountSelector from "@/components/basejump/account-selector";

interface Props {
    accountId: string;
}
export default function NavigatingAccountSelector({accountId}: Props) {
    const router = useRouter();

    return (
        <AccountSelector
            accountId={accountId}
            onAccountSelected={(account) => router.push(account?.personal_account ? `/dashboard` : `/dashboard/${account?.slug}`)}
        />
    )
}