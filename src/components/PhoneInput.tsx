import { useState, useRef } from 'react';

const countries = [
  { code: '+7', flag: '🇷🇺', name: 'Россия', mask: '(___) ___-__-__' },
  { code: '+7', flag: '🇰🇿', name: 'Казахстан', mask: '(___) ___-__-__' },
  { code: '+375', flag: '🇧🇾', name: 'Беларусь', mask: '(__) ___-__-__' },
  { code: '+380', flag: '🇺🇦', name: 'Украина', mask: '(__) ___-__-__' },
  { code: '+998', flag: '🇺🇿', name: 'Узбекистан', mask: '(__) ___-__-__' },
];

interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  className?: string;
}

export default function PhoneInput({ value, onChange, className }: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(countries[0]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract digits only from the local part
  const getDigits = (v: string) => v.replace(/\D/g, '');

  // Format digits according to mask
  const formatPhone = (digits: string, mask: string) => {
    let i = 0;
    let result = '';
    for (const ch of mask) {
      if (i >= digits.length) break;
      if (ch === '_') {
        result += digits[i++];
      } else {
        result += ch;
      }
    }
    return result;
  };

  // Get max digits from mask
  const maxDigits = (mask: string) => (mask.match(/_/g) || []).length;

  // Parse current local number from full value
  const localFromValue = () => {
    if (!value) return '';
    // Remove the country code prefix
    let local = value;
    for (const c of countries) {
      if (value.startsWith(c.code)) {
        local = value.slice(c.code.length);
        break;
      }
    }
    return getDigits(local);
  };

  const digits = localFromValue();
  const formatted = formatPhone(digits, selected.mask);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = getDigits(e.target.value);
    const limited = raw.slice(0, maxDigits(selected.mask));
    onChange(selected.code + limited);
  };

  const selectCountry = (country: typeof countries[0]) => {
    setSelected(country);
    setOpen(false);
    // Re-emit with new code
    onChange(country.code + digits.slice(0, maxDigits(country.mask)));
    inputRef.current?.focus();
  };

  return (
    <div className={`relative flex ${className || ''}`}>
      {/* Country selector */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 border border-border border-r-0 px-3 py-3 bg-muted/30 text-sm hover:bg-muted/50 transition-colors flex-shrink-0"
      >
        <span>{selected.flag}</span>
        <span className="text-foreground">{selected.code}</span>
        <span className="text-muted-foreground text-xs ml-0.5">▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-1 z-50 bg-background border border-border shadow-lg min-w-[200px]"
          >
            {countries.map((c, i) => (
              <button
                key={`${c.code}-${i}`}
                type="button"
                onClick={() => selectCountry(c)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left ${
                  c === selected ? 'bg-muted/30 text-primary' : 'text-foreground'
                }`}
              >
                <span>{c.flag}</span>
                <span>{c.code}</span>
                <span className="text-muted-foreground">{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Phone input */}
      <input
        ref={inputRef}
        type="tel"
        value={formatted}
        onChange={handleInput}
        placeholder={selected.mask.replace(/_/g, '0')}
        className="flex-1 min-w-0 bg-transparent border border-border px-4 py-3 text-foreground text-sm focus:outline-none focus:border-primary transition-colors"
        maxLength={selected.mask.length}
        required
      />
    </div>
  );
}
