/**
 * PageTransition.jsx — Framer Motion page wrapper for CrimeCast
 * Wraps any page to give it a consistent slide-up + fade-in entrance.
 */
import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  initial:  { opacity: 0, y: 18 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -10 },
};

const PageTransition = ({ children, className = '', delay = 0 }) => (
  <motion.div
    variants={variants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={{
      duration: 0.38,
      delay,
      ease: [0.16, 1, 0.3, 1],
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export default PageTransition;
