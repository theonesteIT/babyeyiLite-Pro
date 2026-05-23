import React from 'react';

/**
 * A responsive wrapper that centers content and applies max‑width.
 * Usage: <ResponsiveContainer>{children}</ResponsiveContainer>
 */
export default function ResponsiveContainer({ children }) {
  return (
    <div className="mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
