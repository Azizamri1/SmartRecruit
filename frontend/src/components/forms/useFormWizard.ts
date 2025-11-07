import { useMemo, useState } from "react";

export function useFormWizard<T extends Record<string, any>>(steps: string[], initial: T){
  const [step, setStep] = useState(0);
  const [data, setData] = useState<T>(initial);
  const pct = useMemo(() => Math.round(((step+1)/steps.length)*100), [step, steps.length]);
  const next = () => setStep(s => Math.min(s+1, steps.length-1));
  const prev = () => setStep(s => Math.max(s-1, 0));
  const goto = (i:number) => setStep(() => Math.min(Math.max(i,0), steps.length-1));
  const patch = (p: Partial<T>) => setData(d => ({...d, ...p}));
  return { step, steps, pct, data, patch, next, prev, goto, isLast: step===steps.length-1 };
}

