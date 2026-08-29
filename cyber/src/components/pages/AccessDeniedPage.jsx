import React from 'react';
import { ShieldAlert } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

const AccessDeniedPage = ({ navigate }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center p-8 space-y-6 border-red-500/20 bg-zinc-950/80">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-950/20 border border-red-500/20 flex items-center justify-center animate-bounce">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="space-y-2 font-mono uppercase">
          <h1 className="text-xl font-black text-white">Access Denied</h1>
          <p className="text-[10px] text-zinc-500 font-bold tracking-widest mt-1">403 - Forbidden Security Sequence</p>
        </div>
        <p className="text-zinc-400 font-mono text-[10px] leading-relaxed uppercase">
          Your current terminal credentials do not satisfy the required authorization bounds for this system partition.
        </p>
        <Button onClick={() => navigate('dashboard')} className="w-full py-3 mt-4">
          RETURN TO SAFE PARTITION
        </Button>
      </Card>
    </div>
  );
};

export default React.memo(AccessDeniedPage);
