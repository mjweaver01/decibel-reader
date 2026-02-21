import { useEffect, useRef, useState } from 'react';

interface SoundTypeMultiselectProps {
  options: string[];
  selected: string[];
  onToggle: (name: string) => void;
  onRemove: (name: string) => void;
  placeholder?: string;
}

export function SoundTypeMultiselect({
  options,
  selected,
  onToggle,
  onRemove,
  placeholder = 'Search...',
}: SoundTypeMultiselectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        target &&
        !containerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm text-zinc-400">
        Sound types to record
      </label>
      <p className="mb-2 text-xs text-zinc-500">
        Leave empty to record any loud sound. Search and select specific types.
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map(name => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-3 py-1 text-sm text-white ring-1 ring-emerald-500"
          >
            {name}
            <button
              type="button"
              onClick={() => onRemove(name)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-emerald-500/50"
              aria-label={`Remove ${name}`}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        {open && (
          <ul
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-lg"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-500">No matches</li>
            ) : (
              filtered.map(name => {
                const isSelected = selected.includes(name);
                return (
                  <li
                    key={name}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onToggle(name);
                      setQuery('');
                    }}
                    className={`cursor-pointer px-3 py-2 text-sm ${
                      isSelected
                        ? 'bg-emerald-600/30 text-emerald-300'
                        : 'text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {name}
                    {isSelected && (
                      <span className="ml-2 text-emerald-400">✓</span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
