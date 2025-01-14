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
      className={`text-[1.2rem] sm:text-[1.3rem] md:text-[1.4rem] link-style text-left ${isActive ? 'underline opacity-100' : 'opacity-40'}`}
    >
      {label}
    </button>
  );
}
