import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { UI_MOTION } from './design/motion';
import './index.css';

// Separate entry surface: the lab never mounts the document store or workbench.
const Page = new URLSearchParams(window.location.search).get('lab') === 'tokenizer'
  ? lazy(() => import('./lab/TokenizerLab'))
  : lazy(() => import('./App.tsx'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user" transition={UI_MOTION.panel}>
      <Suspense fallback={<div role="status" style={{ padding: 32 }}>正在打开…</div>}><Page /></Suspense>
    </MotionConfig>
  </StrictMode>,
);
