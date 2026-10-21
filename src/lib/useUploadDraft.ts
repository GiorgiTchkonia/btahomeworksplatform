import { useEffect, useRef } from 'react';
import { removeUnlinkedFile, uploadFile } from './api';

/** Track new uploads separately from files already attached to a saved record. */
export function useUploadDraft() {
  const paths = useRef(new Set<string>());
  const epoch = useRef(0);
  const mounted = useRef(true);

  const discard = () => {
    epoch.current++;
    const abandoned = [...paths.current];
    paths.current.clear();
    for (const path of abandoned) {
      void removeUnlinkedFile(path).catch(error => console.warn('Draft file cleanup failed:', error));
    }
  };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; discard(); };
  }, []);

  const upload = async (...args: Parameters<typeof uploadFile>) => {
    const generation = epoch.current;
    const result = await uploadFile(...args);
    if (!mounted.current || generation !== epoch.current) {
      await removeUnlinkedFile(result.fileUrl);
      throw new Error('ატვირთვა გაუქმდა.');
    }
    paths.current.add(result.fileUrl);
    return result;
  };

  const saved = (path?: string) => {
    if (path) paths.current.delete(path);
    discard();
  };

  return { upload, discard, saved };
}
