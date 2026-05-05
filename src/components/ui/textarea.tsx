import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-28 w-full rounded-[10px] px-3 py-3 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-white focus:border-2 focus:border-[#00C1CE] placeholder:text-[#B6B9C8] dark:placeholder:text-[#5871A7] dark:bg-[#151E3A]',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
