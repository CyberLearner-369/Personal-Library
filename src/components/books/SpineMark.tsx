import { spineColor } from '@/lib/spine';
import { cn } from '@/lib/utils';

/** The signature detail: a deterministic cloth-binding colour per title. */
export function SpineMark({ title, className }: { title: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block w-1 self-stretch rounded-full', className)}
      style={{ backgroundColor: spineColor(title) }}
    />
  );
}
