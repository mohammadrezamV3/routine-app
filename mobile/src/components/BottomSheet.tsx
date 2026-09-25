import { ReactNode } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 500;

// جایگزین مودال‌های وسط‌صفحه در وب — روی موبایل شیت از پایین بالا میاد و
// با کشیدن به پایین (drag-to-dismiss) بسته می‌شه؛ استفاده بشه به‌جای
// centered modal طبق دستور تسک.
export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.5)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-card"
            style={{ background: "var(--surface-1)", borderTop: "1px solid var(--surface-line)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_e, info: PanInfo) => {
              if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
                onClose();
              }
            }}
          >
            <div className="no-select flex justify-center pb-1 pt-2.5">
              <div className="h-1.5 w-10 rounded-full" style={{ background: "var(--surface-line)" }} />
            </div>
            {title && (
              <div className="px-5 pb-3 font-vazir text-[15px] font-semibold" style={{ color: "var(--text)" }}>
                {title}
              </div>
            )}
            <div
              className="overflow-y-auto px-5 pb-6"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
