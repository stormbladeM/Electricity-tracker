"use client";

import type { ReactNode } from "react";
import { AdminDenied } from "./admin-denied";
import { AdminSidebar } from "./admin-sidebar";
import { useAdminAccess } from "./use-admin-access";

/**
 * The frame every admin screen renders inside: access check, nav, content
 * column.
 *
 * It sits in the route layout rather than in each page so the check happens
 * once and a new section can't forget it. The content column is capped wide
 * (max-w-6xl) — admin tables want the room the user app deliberately doesn't
 * take.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { isLoading, staffRole } = useAdminAccess();

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col lg:flex-row" aria-busy="true">
        <div className="h-12 border-b border-hairline bg-surface lg:h-auto lg:w-56 lg:border-r lg:border-b-0" />
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
            <div className="h-7 w-48 animate-pulse rounded bg-surface" />
            <div className="h-4 w-72 animate-pulse rounded bg-surface" />
          </div>
        </main>
      </div>
    );
  }

  if (!staffRole) return <AdminDenied />;

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <AdminSidebar role={staffRole} />
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
