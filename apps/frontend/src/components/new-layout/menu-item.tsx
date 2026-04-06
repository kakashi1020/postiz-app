'use client';
import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';

export const MenuItem: FC<{ label: string; icon: ReactNode; path: string; onClick?: () => void; badge?: number }> = ({
  label,
  icon,
  path,
  onClick,
  badge,
}) => {
  const currentPath = usePathname();
  const isActive = currentPath.indexOf(path) === 0;

  const className = clsx(
    'w-full minCustom:h-[54px] custom:h-[30px] py-[8px] px-[6px] gap-[4px] flex flex-col custom:flex-row text-[10px] font-[600] items-center minCustom:justify-center rounded-[12px] hover:text-textItemFocused hover:bg-boxFocused',
    isActive ? 'text-textItemFocused bg-boxFocused' : 'text-textItemBlur'
  );

  const badgeEl = badge && badge > 0 ? (
    <div className="absolute top-[2px] end-[2px] min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[9px] font-[700] flex items-center justify-center px-[3px]">
      {badge > 99 ? '99+' : badge}
    </div>
  ) : null;

  if (onClick) {
    return (
      <button onClick={onClick} className={clsx(className, 'relative')}>
        <div className="custom:hidden">{icon}</div>
        <div className="text-[10px]">{label}</div>
        {badgeEl}
      </button>
    );
  }

  return (
    <Link
      prefetch={true}
      href={path}
      {...path.indexOf('http') === 0 && { target: '_blank' }}
      className={clsx(className, 'relative')}
    >
      <div className="custom:hidden">{icon}</div>
      <div className="text-[10px]">{label}</div>
      {badgeEl}
    </Link>
  );
};
