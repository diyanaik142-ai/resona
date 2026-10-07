import React from 'react';
import { LockKeyhole } from 'lucide-react';

export default function FeatureUnavailable({ title }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-center">
      <LockKeyhole className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
      <h3 className="mt-3 text-base font-bold text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-300">{title} isn’t available on your current plan.</p>
      <p className="mt-2 text-xs text-slate-500">Your administrator has disabled this feature for your current plan.</p>
    </div>
  );
}
