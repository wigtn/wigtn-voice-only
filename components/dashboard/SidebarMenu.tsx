'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SidebarMenuProps {
  icon: ReactNode;
  label: string;
  isCollapsed: boolean;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}

export default function SidebarMenu({
  icon,
  label,
  isCollapsed,
  isActive,
  onClick,
  badge,
}: SidebarMenuProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
        'hover:bg-gray-800',
        isActive && 'bg-cyan-900/50 text-cyan-400 hover:bg-cyan-900/50',
        !isActive && 'text-gray-400',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left text-sm font-medium truncate">
            {label}
          </span>
          {badge !== undefined && badge > 0 && (
            <span className="flex-shrink-0 bg-cyan-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </button>
  );
}
