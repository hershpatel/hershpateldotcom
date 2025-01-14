'use client';

import { type SectionId } from './sections';

interface SectionButtonProps {
  id: SectionId;
  label: string;
  isActive: boolean;
  onClick: (id: SectionId) => void;
}

export function SectionButton({ id, label, isActive, onClick }: SectionButtonProps) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`text-[1.6rem] link-style text-left ${isActive ? 'underline opacity-100' : 'opacity-40'}`}
    >
      {label}
    </button>
  );
}
