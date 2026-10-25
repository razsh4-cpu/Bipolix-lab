"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; ready: boolean };

export function MainNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="ניווט ראשי" className="mx-auto max-w-7xl overflow-x-auto px-4">
      <ul className="flex gap-1 whitespace-nowrap">
        {items.map((item) => {
          if (!item.ready) {
            return (
              <li key={item.href}>
                <span aria-disabled="true" title="יתווסף בשלב הבא" className="block px-3 py-2 text-sm text-slate-400">
                  {item.label} <span className="text-xs">(בקרוב)</span>
                </span>
              </li>
            );
          }
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`block border-b-2 px-3 py-2 text-sm ${
                  active ? "border-blue-700 font-medium text-blue-800" : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
