import { JSX } from 'react';

const LinkComponent = ({
  label,
  icon,
  active,
}: {
  label: string;
  icon: JSX.Element;
  active?: boolean;
}) => {
  return (
    <div
      className={`flex items-center w-full gap-2.5 hover:bg-[#F7F8F9] dark:hover:bg-[#2D385B] duration-200 ease-in-out px-4 py-2.5 rounded-[8px] hover:text-clgeodrops group cursor-pointer ${
        active && 'text-clgeodrops bg-[#F7F8F9] dark:bg-[#2D385B]'
      }`}
    >
      <div
        className={` group-hover:text-clgeodrops ${
          active
            ? 'text-clgeodrops bg-[#F7F8F9] dark:bg-[#2D385B]'
            : 'text-[#5871A7]'
        }`}
      >
        {icon}
      </div>
      <p className="font-semibold">{label}</p>
    </div>
  );
};

export default LinkComponent;
