interface Props {
    title: string;
    description: string;
}
export default function DashboardTitle({title, description}: Props) {
    return (
        <div className="space-y-0.5 max-w-screen-xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="text-muted-foreground">
                {description}
            </p>
        </div>
    )
}