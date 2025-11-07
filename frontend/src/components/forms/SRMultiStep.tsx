import React from "react";
import "./sr.form.css";

export function SRStepper({steps, active}:{steps:string[]; active:number}){
  return (
    <div className="srStepper" aria-label="Form steps">
      {steps.map((s,i)=>(
        <React.Fragment key={s}>
          <div className={`srStepper__item ${i===active?"srStepper__item--active":""}`} aria-current={i===active?"step":undefined}>
            <div className="srStepper__dot">{i+1}</div><div>{s}</div>
          </div>
          {i<steps.length-1 && <div className="srStepper__line" />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function SRMultiStep({
  title, subtitle, steps, active, showProgress=true, children,
}:{
  title:string; subtitle?:string; steps:string[]; active:number; showProgress?:boolean; children:React.ReactNode;
}){
  const pct = Math.round(((active+1)/steps.length)*100);
  return (
    <div className="srForm">
      <div className="srForm__shell">
        <div className="srForm__card">
          <h1 className="srForm__title">{title}</h1>
          {subtitle && <p className="srForm__subtitle">{subtitle}</p>}
          {showProgress && (
            <>
              <SRStepper steps={steps} active={active}/>
              <div className="srForm__progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="srForm__progressFill" style={{width:`${pct}%`}} />
              </div>
            </>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function SRSection({
  title, columns="two", children
}:{title:string; columns?:"one"|"two"|"three"; children:React.ReactNode;}){
  return (
    <section style={{marginTop:16}}>
      <h2 className="srForm__label" style={{fontSize:16}}>{title}</h2>
      <div className={`srForm__grid ${columns}`}>{children}</div>
    </section>
  );
}

