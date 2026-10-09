import React, { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, Bookmark, ChevronDown, Trash2, Check, ArrowRight } from 'lucide-react';
import { SavedSearch, Profile } from '../../types';
import { resourceService } from '../../services/resourceService';

interface ResourceSearchBarProps {
  initialSearch?: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  isAdvancedOpen: boolean;
  onToggleAdvanced: () => void;
  activeFilterCount: number;
  currentUser: Profile | null;
  savedSearches: SavedSearch[];
  onApplySavedSearch: (saved: SavedSearch) => void;
  onDeleteSavedSearch: (id: string) => void;
  onOpenSaveModal: () => void;
}

export function ResourceSearchBar({
  initialSearch = '',
  onSearchChange,
  onSearchSubmit,
  isAdvancedOpen,
  onToggleAdvanced,
  activeFilterCount,
  currentUser,
  savedSearches,
  onApplySavedSearch,
  onDeleteSavedSearch,
  onOpenSaveModal,
}: ResourceSearchBarProps) {
  const [inputValue, setInputValue] = useState(initialSearch);
  const [suggestions, setSuggestions] = useState<Array<{ type: string; text: string; subtext?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSavedMenu, setShowSavedMenu] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const savedMenuRef = useRef<HTMLDivElement>(null);

  // Sync when initialSearch changes from external (e.g., URL or clear)
  useEffect(() => {
    setInputValue(initialSearch || '');
  }, [initialSearch]);

  // Debounced search trigger (400ms) + fetch autocomplete suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      onSearchChange(inputValue);

      if (inputValue.trim().length >= 2) {
        try {
          const res = await resourceService.getResourceSearchSuggestions(currentUser, inputValue);
          setSuggestions(res);
        } catch {
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [inputValue, currentUser]);

  // Click outside listener for suggestions and saved searches dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (savedMenuRef.current && !savedMenuRef.current.contains(event.target as Node)) {
        setShowSavedMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      onSearchSubmit();
    }
  };

  const handleSelectSuggestion = (text: string) => {
    setInputValue(text);
    onSearchChange(text);
    setShowSuggestions(false);
    setTimeout(() => onSearchSubmit(), 50);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Main Search Input with Autocomplete */}
        <div className="relative flex-1" ref={searchContainerRef}>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Tìm theo tên tài nguyên, chủ đề, từ khóa, giáo viên..."
              className="w-full pl-10 pr-20 py-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => {
                  setInputValue('');
                  onSearchChange('');
                  setShowSuggestions(false);
                }}
                className="absolute right-12 text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowSuggestions(false);
                onSearchSubmit();
              }}
              className="absolute right-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Tìm
            </button>
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in duration-100">
              <div className="p-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                Gợi ý tìm kiếm
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSuggestion(item.text)}
                    className="px-3 py-2 hover:bg-indigo-50/60 cursor-pointer flex items-center justify-between gap-2 transition group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Search className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                      <span className="text-xs font-medium text-slate-800 group-hover:text-indigo-900 truncate">
                        {item.text}
                      </span>
                    </div>
                    {item.subtext && (
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                        {item.subtext}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls: Lọc nâng cao & Saved Searches */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Advanced Filter Toggle Button */}
          <button
            type="button"
            onClick={onToggleAdvanced}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              isAdvancedOpen || activeFilterCount > 0
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-2xs'
                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Lọc nâng cao</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Saved Searches Dropdown Menu */}
          <div className="relative" ref={savedMenuRef}>
            <button
              type="button"
              onClick={() => setShowSavedMenu(!showSavedMenu)}
              className="px-3 py-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-medium text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              title="Bộ lọc đã lưu"
            >
              <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">Bộ lọc lưu</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showSavedMenu ? 'rotate-180' : ''}`} />
            </button>

            {showSavedMenu && (
              <div className="absolute right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="font-semibold text-slate-800">Bộ lọc của tôi</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSavedMenu(false);
                      onOpenSaveModal();
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    + Lưu bộ lọc hiện tại
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1">
                  {savedSearches.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-[11px]">
                      Chưa có bộ lọc nào được lưu.
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSavedMenu(false);
                            onOpenSaveModal();
                          }}
                          className="text-indigo-600 underline font-medium cursor-pointer"
                        >
                          Lưu tiêu chí hiện tại
                        </button>
                      </div>
                    </div>
                  ) : (
                    savedSearches.map((s) => (
                      <div
                        key={s.id}
                        className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition"
                      >
                        <div
                          onClick={() => {
                            onApplySavedSearch(s);
                            setShowSavedMenu(false);
                          }}
                          className="flex-1 truncate cursor-pointer pr-2"
                        >
                          <div className="font-medium text-slate-900 group-hover:text-indigo-600 truncate">
                            {s.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(s.created_at).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onApplySavedSearch(s);
                              setShowSavedMenu(false);
                            }}
                            className="p-1 hover:bg-indigo-100 text-indigo-600 rounded transition cursor-pointer"
                            title="Áp dụng bộ lọc này"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Bạn có chắc muốn xóa bộ lọc "${s.name}"?`)) {
                                onDeleteSavedSearch(s.id);
                              }
                            }}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Xóa bộ lọc"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
