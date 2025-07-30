import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDownIcon } from './icons.tsx';

interface AnimatedListProps<T> {
  items: T[];
  selectedItem: T | null;
  onItemSelected: (item: T) => void;
  displayKey?: keyof T; // Key to display in the list, if items are objects
  placeholder?: string;
}

const AnimatedList = <T extends string | { [key: string]: any }>({
  items,
  selectedItem,
  onItemSelected,
  displayKey,
  placeholder = "Select an option"
}: AnimatedListProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const getItemDisplay = useCallback((item: T | null) => {
    if (item === null) return '';
    if (typeof item === 'string') {
      return item;
    }
    if (displayKey && item && typeof item === 'object') {
      return item[displayKey] as string;
    }
    return '';
  }, [displayKey]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
        const selectedIndex = items.findIndex(item => getItemDisplay(item) === getItemDisplay(selectedItem));
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, items, selectedItem, getItemDisplay]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
        const itemElement = listRef.current.children[highlightedIndex] as HTMLElement;
        if (itemElement) {
            itemElement.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(true);
        }
        return;
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + items.length) % items.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          onItemSelected(items[highlightedIndex]);
          setIsOpen(false);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (item: T) => {
    onItemSelected(item);
    setIsOpen(false);
  };
  
  const selectedDisplay = selectedItem ? getItemDisplay(selectedItem) : placeholder;

  return (
    <div className="relative w-full" ref={wrapperRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="w-full flex items-center justify-between p-2.5 rounded-lg bg-bg-uploader-light dark:bg-bg-uploader-dark border border-border-primary-light dark:border-border-primary-dark focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors duration-200 hover:border-purple-400 dark:hover:border-purple-500"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedDisplay}</span>
        <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          className="absolute z-20 w-full mt-1 bg-bg-secondary-light dark:bg-bg-secondary-dark border border-border-primary-light dark:border-border-primary-dark rounded-lg shadow-lg max-h-60 overflow-y-auto animated-list-panel animate-scale-in"
          style={{ animationDuration: '150ms' }}
          role="listbox"
        >
          {items.map((item, index) => {
             const display = getItemDisplay(item);
             return (
              <li
                key={index} // Using index as key because display might not be unique
                className={`px-4 py-2 cursor-pointer transition-colors duration-150 ${
                  index === highlightedIndex ? 'bg-purple-600/20 text-purple-700 dark:text-purple-300' : 'hover:bg-gray-500/10'
                }`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={index === highlightedIndex}
              >
                {display}
              </li>
             );
          })}
        </ul>
      )}
    </div>
  );
};

export default AnimatedList;
