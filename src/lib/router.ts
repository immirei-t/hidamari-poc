import { useEffect, useState } from 'react'

// 依存なしの小さなハッシュルーター（#/memories/abc → ['memories', 'abc']）
export function useRoute(): string[] {
  const read = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [parts, setParts] = useState(read)
  useEffect(() => {
    const on = () => {
      setParts(read())
      document.querySelector('.phone-scroll')?.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return parts
}

export const go = (path: string) => {
  location.hash = '#' + (path.startsWith('/') ? path : '/' + path)
}

export const back = (fallback = '/') => {
  if (history.length > 1) history.back()
  else go(fallback)
}
