// client/App.tsx
import { useEffect } from 'react';
import { initPixels } from './analytics'; // <-- corrected path

export default function App() {
  useEffect(() => {
    initPixels();
  }, []);

  return null;
}
