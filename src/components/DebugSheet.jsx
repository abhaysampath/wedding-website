import { useAuth } from '../context/useAuth'

export default function DebugSheet() {
  const { content } = useAuth()

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-lg max-h-[60vh] overflow-auto bg-charcoal/90 text-green-400 text-xs font-mono p-3 rounded border border-green-400/30">
      <div className="font-bold mb-1 text-green-300">
        GUESTS ({content.guests.length})
      </div>
      <pre className="whitespace-pre-wrap break-all">
        {JSON.stringify(content.guests, null, 2)}
      </pre>
    </div>
  )
}
