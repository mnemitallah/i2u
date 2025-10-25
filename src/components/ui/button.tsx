
import * as React from 'react'
import clsx from '@/lib/clsx'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'outline'|'secondary', size?: 'sm'|'md'|'icon' }
export function Button({ className, variant='default', size='md', ...props }: Props) {
  const variants = {
    default: 'bg-indigo-600 text-white hover:bg-indigo-700',
    outline: 'border border-gray-300 hover:bg-gray-50',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200'
  } as const
  const sizes = {
    sm: 'px-2 py-1 text-sm rounded-lg',
    md: 'px-4 py-2 rounded-xl',
    icon: 'p-2 rounded-xl'
  } as const
  return <button className={clsx('transition', variants[variant], sizes[size], className)} {...props} />
}
