
import * as React from 'react'
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={'w-full border rounded-xl px-3 py-2 outline-none focus:ring focus:ring-indigo-200 ' + (props.className||'')} />
}
