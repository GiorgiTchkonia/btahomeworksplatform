import React from 'react';
import { GraduationCap } from 'lucide-react';

/**
 * BTA Academy logo — icon-only, no text inside.
 * Uses the official BTA brand color #2B4EFF.
 */
export default function BtaLogo({ size = 40 }: { size?: number }) {
  const iconSize = Math.round(size * 0.54);
  const radius = Math.round(size * 0.26);

  return (
    <div
      style={{ width: size, height: size, borderRadius: radius }}
      className="bg-[#2B4EFF] flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20"
    >
      <GraduationCap
        size={iconSize}
        className="text-white"
        strokeWidth={1.8}
      />
    </div>
  );
}
