import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc' | null;
}

interface SortableHeaderProps {
  field: string;
  children: React.ReactNode;
  sortConfig: SortConfig;
  onSort: (field: string) => void;
  className?: string;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  field,
  children,
  sortConfig,
  onSort,
  className = '',
}) => {
  const isActive = sortConfig.field === field;
  const direction = isActive ? sortConfig.direction : null;

  const getIcon = () => {
    if (!isActive) return <ArrowUpDown className="h-4 w-4" />;
    if (direction === 'asc') return <ArrowUp className="h-4 w-4" />;
    if (direction === 'desc') return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(field)}
      className={`h-auto p-0 font-medium hover:bg-transparent ${className}`}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {getIcon()}
      </div>
    </Button>
  );
};
