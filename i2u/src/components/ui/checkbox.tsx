
import * as React from 'react'
export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" {...props} className={'h-4 w-4 rounded border-gray-300 ' + (className||'')} />
}
