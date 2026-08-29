import React from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';

const NotFoundPage = ({ navigate }) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center p-8 space-y-6 border-emerald-950 bg-zinc-950/80">
        <h1 className="text-8xl font-black text-emerald-900 leading-none select-none font-mono">404</h1>
        <div className="space-y-1 font-mono uppercase">
          <h2 className="text-lg font-black text-white">Page Not Found</h2>
          <p className="text-[10px] text-zinc-500 font-bold tracking-widest mt-1">unrecognized routing sequence</p>
        </div>
        <p className="text-zinc-400 font-mono text-[10px] leading-relaxed uppercase">
          The requested system cluster partition path could not be located in our ledger registries.
        </p>
        <Button onClick={() => navigate('dashboard')} className="w-full py-3 mt-4">
          RETURN TO DASHBOARD
        </Button>
      </Card>
    </div>
  );
};

export default React.memo(NotFoundPage);
