import * as React from 'react';
import { Tooltip } from 'radix-ui';
import { InfoIcon } from 'lucide-react';

const CustomTooltip = ({ content }: { content: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  // Calculate optimal position for mobile tooltip
  const calculatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = Math.min(280, viewportWidth * 0.9); // Max 280px or 90% of viewport
    const tooltipHeight = 100; // Approximate height
    const padding = 16; // Padding from screen edges

    let x = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    let y = triggerRect.top - tooltipHeight - 12; // 12px gap

    // Adjust horizontal position if tooltip would overflow
    if (x < padding) {
      x = padding;
    } else if (x + tooltipWidth > viewportWidth - padding) {
      x = viewportWidth - tooltipWidth - padding;
    }

    // If tooltip would go above viewport, show it below the trigger
    if (y < padding) {
      y = triggerRect.bottom + 12;
    }

    setPosition({ x, y });
  }, []);

  // Close tooltip when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Calculate position when opening tooltip or on resize
  React.useEffect(() => {
    if (isOpen) {
      calculatePosition();

      const handleResize = () => calculatePosition();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, calculatePosition]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      {/* Mobile tooltip */}
      <div className='lg:hidden flex items-center justify-center'>
        <div ref={triggerRef} className='inline-block'>
          <InfoIcon className='size-4 cursor-pointer' onClick={handleToggle} />
        </div>
        {isOpen && (
          <>
            {/* Backdrop for better UX */}
            <div
              className='fixed inset-0 bg-black/20 z-[999]'
              onClick={() => setIsOpen(false)}
            />
            {/* Tooltip content */}
            <div
              ref={tooltipRef}
              className='fixed z-[1000] pointer-events-auto'
              style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                maxWidth: 'min(280px, 90vw)',
              }}
            >
              <div className='bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-lg border border-gray-700'>
                <div className='break-words leading-relaxed'>{content}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop tooltip */}
      <div className='hidden lg:block'>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <InfoIcon className='size-4 cursor-pointer' />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className='select-none rounded bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] max-w-[300px] z-[1000] px-[15px] py-2.5 text-[15px] leading-5 text-violet11 shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] will-change-[transform,opacity] data-[state=delayed-open]:data-[side=bottom]:animate-slideUpAndFade data-[state=delayed-open]:data-[side=left]:animate-slideRightAndFade data-[state=delayed-open]:data-[side=right]:animate-slideLeftAndFade data-[state=delayed-open]:data-[side=top]:animate-slideDownAndFade'
                sideOffset={5}
              >
                {content}
                <Tooltip.Arrow className='fill-white dark:fill-[#151E3A]' />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
    </div>
  );
};

export default CustomTooltip;
