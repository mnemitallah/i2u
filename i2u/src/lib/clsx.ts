
export default function clsx(...args: any[]) {
  return args.filter(Boolean).join(' ')
}
