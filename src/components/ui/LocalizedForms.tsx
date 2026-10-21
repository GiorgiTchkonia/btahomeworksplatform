import React, { useRef } from 'react';
import { useDialog } from './DialogProvider';

export default function LocalizedForms({ children }: { children: React.ReactNode }) {
  const { showAlert }=useDialog();
  const showing=useRef(false);
  return <div className="contents" onInvalidCapture={event=>{
    event.preventDefault();
    if(showing.current)return;
    showing.current=true;queueMicrotask(()=>{showing.current=false;});
    const input=event.target as HTMLInputElement;
    const validity=input.validity;
    const message=validity.typeMismatch&&input.type==='email'?'მიუთითეთ სწორი ელფოსტის მისამართი.':validity.tooShort?`ველი უნდა შეიცავდეს მინიმუმ ${input.minLength} სიმბოლოს.`:validity.valueMissing?'გთხოვთ შეავსოთ ყველა სავალდებულო ველი.':'გადაამოწმეთ შეყვანილი მონაცემები და სცადეთ ხელახლა.';
    showAlert(message,'error');
  }}>{children}</div>;
}
