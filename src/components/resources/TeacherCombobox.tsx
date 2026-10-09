import React, { useState, useRef, useEffect } from 'react';
import { Profile } from '../../types';
import { Search, ChevronDown, Check, X, User } from 'lucide-react';
import { vietnameseSearchMatches } from '../../utils/formatters';

interface TeacherComboboxProps {
  teachers: Profile[];
  selectedTeacherId: string;
  onChange: (teacherId: string) => void;
  placeholder?: string;
}

export function TeacherCombobox({
  teachers,
  selectedTeacherId,
  onChange,
  placeholder = 'Tất cả giáo viên',
}: TeacherComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  // Filter teachers by query (ignoring case & accents)
  const filteredTeachers = teachers.filter((t) => {
    if (!searchQuery.trim()) return true;
    return (
      vietnameseSearchMatches(t.full_name, searchQuery) ||
      vietnameseSearchMatches(t.email, searchQuery) ||
      (t.department?.name && vietnameseSearchMatches(t.department.name, searchQuery))
    );
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-left flex items-center justify-between gap-2 transition focus:outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
      >
        <div className="flex items-center gap-1.5 truncate">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={`truncate ${selectedTeacher ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
            {selectedTeacher ? selectedTeacher.full_name : placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {selectedTeacher && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('all');
              }}
              className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition"
              title="Bỏ chọn"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[260px] bg-white rounded-xl border border-slate-200 shadow-lg p-2 text-xs">
          {/* Search Box inside combobox */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên giáo viên, tổ..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {/* Option "Tất cả giáo viên" */}
            <div
              onClick={() => {
                onChange('all');
                setIsOpen(false);
                setSearchQuery('');
              }}
              className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition ${
                selectedTeacherId === 'all' || !selectedTeacherId
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span>{placeholder}</span>
              {(selectedTeacherId === 'all' || !selectedTeacherId) && <Check className="w-3.5 h-3.5 text-indigo-600" />}
            </div>

            {filteredTeachers.length === 0 ? (
              <div className="py-3 text-center text-slate-400 text-[11px]">
                Không tìm thấy giáo viên nào
              </div>
            ) : (
              filteredTeachers.map((t) => {
                const isSelected = t.id === selectedTeacherId;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      onChange(t.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                      isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-medium text-slate-900 truncate">{t.full_name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {t.department?.name || 'Chưa gán tổ'}{' '}
                        {t.role === 'SUBJECT_LEADER'
                          ? '• Tổ trưởng'
                          : t.role === 'VICE_SUBJECT_LEADER'
                          ? '• Tổ phó'
                          : ''}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
