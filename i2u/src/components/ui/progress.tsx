
import * as React from 'react'
export function Progress({ value=0 }: { value?: number }) {
  return <div className="w-full h-2 bg-gray-200 rounded-xl overflow-hidden"><div className="h-full bg-indigo-600" style={{width: `${Math.min(100, Math.max(0, value))}%`}}/></div>
}
