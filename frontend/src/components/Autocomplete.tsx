import React, { useState, useRef, useEffect } from 'react';
import './Autocomplete.css';

interface AutocompleteProps {
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
}

const Autocomplete: React.FC<AutocompleteProps> = ({
  id,
  name,
  value,
  onChange,
  suggestions,
  placeholder,
  required,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      // Show all suggestions when field is empty
      setFilteredSuggestions(suggestions);
    }
    setHighlightedIndex(-1);
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
          selectSuggestion(filteredSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.stopPropagation(); // Prevent modal from closing
        setIsOpen(false);
        break;
    }
  };

  const selectSuggestion = (suggestion: string) => {
    const syntheticEvent = {
      target: { name, value: suggestion },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setIsOpen(false);
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        type="text"
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(filteredSuggestions.length > 0)}
        placeholder={placeholder}
        required={required}
        autoComplete="chrome-off"
        data-lpignore="true"
        data-form-type="other"
        data-1p-ignore="true"
      />
      {isOpen && filteredSuggestions.length > 0 && (
        <ul className="autocomplete-suggestions">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              className={index === highlightedIndex ? 'highlighted' : ''}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Autocomplete;
