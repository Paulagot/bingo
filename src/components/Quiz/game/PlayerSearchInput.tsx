import React from 'react';
import { X, Search } from 'lucide-react';

type PlayerSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
};

const PlayerSearchInput: React.FC<PlayerSearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search players…',
  autoFocus = false,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {value && (
        <button
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 mr-2 flex items-center rounded p-1 text-gray-500 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default PlayerSearchInput;
