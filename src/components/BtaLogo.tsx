import React from 'react';

/** Approved book monogram for the portal header, footer and browser icon. */
export default function BtaLogo({ size = 40 }: { size?: number }) {
  return <img src="/bta-logo.png" width={size} height={size} alt="" aria-hidden="true"
    className="block shrink-0 select-none" draggable={false} />;
}
