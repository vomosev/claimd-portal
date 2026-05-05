import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils'; // optional utility for class merging

interface StyledIconProps {
  Icon: LucideIcon;
  size?: number;
  className?: string;
  degree?: number;
}

const StyledIcon = ({
  Icon,
  size = 19,
  className,
  degree,
}: StyledIconProps) => {
  return (
    <Icon
      style={{ rotate: `${degree}deg` }}
      size={size}
      className={cn('duration-200 ease-in-out', className)}
    />
  );
};

export default StyledIcon;
