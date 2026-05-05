'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import ukFlag from '@/assets/uk-flag.svg';

const languages = [
  { code: 'en', label: 'English', flag: ukFlag },
  { code: 'fr', label: 'Français', flag: ukFlag },
  { code: 'de', label: 'Deutsch', flag: ukFlag },
  { code: 'es', label: 'Español', flag: ukFlag },
];

const LanguageSelector = () => {
  const [selectedLang, setSelectedLang] = useState(languages[0]);
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute top-4 left-4 z-50" style={{ display: 'none' }}>
      <DropdownMenu onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-2 bg-[#094259]/50 px-2.5 py-2 rounded-[8px] shadow-md transition relative w-[70px] cursor-pointer">
            <Image
              src={selectedLang.flag}
              alt={selectedLang.label}
              width={20}
              height={20}
              className="rounded-full size-[20px]"
            />
            <ChevronDown
              size={20}
              className={`text-white transform transition-transform duration-200 absolute right-2.5 ${
                open ? 'rotate-180' : ''
              }`}
            />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-40 bg-white shadow-lg rounded-md mt-2 translate-x-8">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setSelectedLang(lang)}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer"
            >
              <Image
                src={lang.flag}
                alt={lang.label}
                width={20}
                height={20}
                className="rounded-full"
              />
              {lang.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default LanguageSelector;
