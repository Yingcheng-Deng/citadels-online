"use client";
import { useEffect, useRef, type ReactNode } from "react";

export function GameDialog({ title, onClose, children, className = "" }: {
  title: string; onClose: () => void; children: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={`game-dialog ${className}`} aria-label={title}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-inner">
      <button className="close" onClick={onClose} aria-label={`关闭${title}`}>×</button>
      {children}
    </div>
  </dialog>;
}
