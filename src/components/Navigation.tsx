'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/history', label: 'History' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-purple-700">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-700 font-bold">
                CM
              </span>
              Cyber Metrics
            </Link>
            <div className="hidden sm:flex sm:space-x-3">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition ${
                      isActive
                        ? 'bg-purple-100 text-purple-800'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-sm text-gray-600">
            <div className="text-gray-500">Fast edit, then export when ready</div>
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
              Live
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

