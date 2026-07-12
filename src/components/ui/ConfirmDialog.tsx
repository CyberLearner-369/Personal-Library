import { useCallback, useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
}

/**
 * Promise-based confirmation:
 *   const { confirm, confirmDialog } = useConfirm();
 *   if (await confirm({ title, message, tone: 'danger' })) { ... }
 * Render {confirmDialog} once in the page.
 */
export function useConfirm(): {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  confirmDialog: ReactNode;
} {
  const [pending, setPending] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  const settle = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  const confirmDialog = pending ? (
    <Modal
      open
      onClose={() => settle(false)}
      title={pending.title}
      size="sm"
      footer={
        <>
          <Button onClick={() => settle(false)}>Cancel</Button>
          <Button
            variant={pending.tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => settle(true)}
          >
            {pending.confirmLabel ?? 'Confirm'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">{pending.message}</p>
    </Modal>
  ) : null;

  return { confirm, confirmDialog };
}
