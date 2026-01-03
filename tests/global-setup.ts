import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
  const css = `
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  `;
  const target = path.join(__dirname, 'reduced-motion.css');
  fs.writeFileSync(target, css.trim(), 'utf8');
  process.env.PW_REDUCED_MOTION_CSS = target;
}
