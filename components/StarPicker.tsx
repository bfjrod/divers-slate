'use client'

interface Props {
  value: number   // 0 = unset
  onChange: (rating: number) => void
  size?: 'sm' | 'md'
}

export default function StarPicker({ value, onChange, size = 'md' }: Props) {
  const px = size === 'sm' ? 'w-5 h-5' : 'w-7 h-7'
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className={`${px} transition-colors`}
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
        >
          <svg viewBox="0 0 20 20" fill={n <= value ? '#f59e0b' : 'none'} stroke={n <= value ? '#f59e0b' : '#d1d5db'} strokeWidth={1.5}>
            <path strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  )
}
