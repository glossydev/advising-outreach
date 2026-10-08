export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-navy text-balance">{title}</h1>
        {description && <p className="max-w-2xl leading-relaxed text-muted-foreground text-pretty">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-cloud text-azurite">
        <Icon className="size-5" aria-hidden={true} />
      </span>
      <p className="font-semibold text-navy">{title}</p>
      <p className="max-w-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
