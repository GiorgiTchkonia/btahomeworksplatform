import React from 'react';
import { createPortal } from 'react-dom';

// Keep viewport overlays outside page stacking contexts and clipped containers.
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}
