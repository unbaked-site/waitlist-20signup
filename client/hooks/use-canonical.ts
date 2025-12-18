import { useEffect } from 'react';

export function useCanonical(path: string) {
  useEffect(() => {
    const url = `https://unbakedapp.com${path}`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }

    link.href = url;
  }, [path]);
}
