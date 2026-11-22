import { ImageOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  deviceStorage,
  extractLocalFileId,
  isLocalFileUrl,
} from '../services/deviceStorage';

interface LocalImageProps {
  src: string;
  alt: string;
  className?: string;
}

export default function LocalImage({ src, alt, className = '' }: LocalImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string>(
    isLocalFileUrl(src) ? '' : src
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    if (!isLocalFileUrl(src)) {
      setResolvedUrl(src);
      setFailed(false);
      return;
    }

    const fileId = extractLocalFileId(src);
    deviceStorage
      .getFile(fileId)
      .then((file) => {
        if (!active) return;
        if (!file) {
          setFailed(true);
          return;
        }
        objectUrl = URL.createObjectURL(file.blob);
        setResolvedUrl(objectUrl);
        setFailed(false);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (failed || !resolvedUrl) {
    return (
      <div
        className={`bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 ${className}`}
      >
        <ImageOff className="w-6 h-6 mb-1" />
        <span className="text-[11px]">{failed ? 'Arquivo indisponível' : 'Carregando...'}</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
