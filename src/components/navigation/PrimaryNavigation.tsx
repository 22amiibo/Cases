"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./PrimaryNavigation.module.css";

const destinations = [
  ["Learn", "/learn"],
  ["Practice", "/practice"],
  ["Cases", "/cases"],
  ["Progress", "/progress"],
] as const;

export function PrimaryNavigation() {
  const pathname = usePathname();

  return (
    <nav className={styles.navigation} aria-label="Primary">
      {destinations.map(([label, href]) => (
        <Link
          className={styles.link}
          href={href}
          aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}
          key={href}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
