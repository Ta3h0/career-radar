export type DataStateProps =
  | { kind: 'empty' | 'loading'; title: string; description: string }
  | { kind: 'error' | 'on-hold'; title: string; description: string }

export function DataState({ kind, title, description }: DataStateProps) {
  return (
    <div className="data-state" data-state={kind} aria-busy={kind === 'loading'}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}
