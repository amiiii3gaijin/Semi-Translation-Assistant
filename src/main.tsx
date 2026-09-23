import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { MotionConfig } from 'motion/react';
import { UI_MOTION } from './design/motion';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user" transition={UI_MOTION.panel}>
      <App />
    </MotionConfig>
  </StrictMode>,
);
