import { localizeError } from '@/lib/messages';
import React, { useState } from 'react';
import { getFileViewUrl } from '@/lib/api';
import { useDialog } from './ui/DialogProvider';

/** Resolve on click so a long-open dashboard never uses an expired signed URL. */
export default function StorageFileButton({ file, children, className }: {
  file: string; children: React.ReactNode; className?: string;
}) {
  const [opening, setOpening] = useState(false);
  const { showAlert } = useDialog();

  const openFile = async () => {
    if (opening) return;
    // Open during the user gesture to avoid popup blocking after the async request.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    setOpening(true);
    try {
      const url = await getFileViewUrl(file);
      if (tab) tab.location.replace(url);
      else showAlert('ბრაუზერმა ახალი ფანჯარა დაბლოკა. დაუშვით ფანჯრის გახსნა და სცადეთ ხელახლა.', 'error');
    } catch (error) {
      tab?.close();
      showAlert(localizeError(error, 'ფაილის გახსნა ვერ მოხერხდა.'), 'error');
    } finally {
      setOpening(false);
    }
  };

  return <button type="button" onClick={openFile} disabled={opening} aria-busy={opening}
    className={className}>{opening ? 'იხსნება…' : children}</button>;
}
