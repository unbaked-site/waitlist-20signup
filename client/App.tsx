// client/pages/app.tsx
import { useEffect } from 'react';
import { initPixels } from '../analytics';

export default function App() {
  useEffect(() => {
    initPixels();
  }, []);

  return null;
}
