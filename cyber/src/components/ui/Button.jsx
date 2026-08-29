import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Button = ({ variant = 'primary', size = 'md', loading, children, className = '', ...props }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-black shadow-lg shadow-orange-950/40 active:scale-95',
    secondary: 'glass text-orange-400 font-bold hover:shadow-[0_0_20px_rgba(249,115,22,0.2)]',
    danger: 'bg-gradient-to-r from-red-600 via-orange-600 to-red-700 text-white font-bold shadow-lg shadow-red-950/40',
    ghost: 'bg-transparent hover:bg-orange-950/20 text-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.1)]',
    accent: 'bg-gradient-to-r from-orange-400 via-amber-500 to-red-500 text-black font-black',
    outline: 'bg-transparent border border-orange-500/30 text-white hover:bg-orange-950/20 hover:border-orange-500/60 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-5 py-2.5 text-sm rounded-xl',
    lg: 'px-10 py-4 text-sm uppercase tracking-widest rounded-2xl'
  };

  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      disabled={loading}
      className={`flex items-center justify-center gap-2 font-bold transition-all duration-300 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </motion.button>
  );
};

export default Button;
