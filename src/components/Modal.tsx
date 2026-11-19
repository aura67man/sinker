import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Native <dialog>, which gives us focus trapping, Esc-to-close and an
 * inert background for free.
 */
export function Modal({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  // Set when *we* close the dialog because `open` went false. The native
  // 'close' event fires later either way, and must not be mistaken for the
  // user closing it (that would cancel whatever panel opened next).
  const closingFromProps = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      closingFromProps.current = true;
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onClose={() => {
        if (closingFromProps.current) {
          closingFromProps.current = false;
          return;
        }
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes it.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-body">
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
