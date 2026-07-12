import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { useLibrary } from '@/state/LibraryContext';
import { distinctTags, distinctValues, emptyQuery, type BookQuery } from '@/lib/search';
import {
  BOOK_STATUSES,
  CONDITIONS,
  READING_STATUSES,
  type Book,
} from '@/types/book';

const numberOrNull = (value: string): number | null => {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function ValueSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Any</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
      {value && !options.includes(value) && <option value={value}>{value}</option>}
    </Select>
  );
}

export function BookFilters({
  open,
  onClose,
  query,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  query: BookQuery;
  onApply: (query: BookQuery) => void;
}) {
  const { books } = useLibrary();
  const [draft, setDraft] = useState<BookQuery>(query);

  useEffect(() => {
    if (open) setDraft(query);
  }, [open, query]);

  const options = useMemo(
    () => ({
      authors: distinctValues(books, (b: Book) => b.author),
      publishers: distinctValues(books, (b) => b.publisher),
      languages: distinctValues(books, (b) => b.language),
      categories: distinctValues(books, (b) => b.category),
      rooms: distinctValues(books, (b) => b.room),
      shelves: distinctValues(books, (b) => b.shelf),
      tags: distinctTags(books),
    }),
    [books],
  );

  const set = <K extends keyof BookQuery>(key: K, value: BookQuery[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Filter books"
      size="lg"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => onApply({ ...emptyQuery(), q: draft.q, sort: draft.sort })}
          >
            Clear all
          </Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onApply(draft)}>
            Apply filters
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Status"
          value={draft.status}
          onChange={(event) => set('status', event.target.value as BookQuery['status'])}
        >
          <option value="">Any</option>
          {BOOK_STATUSES.map((status) => (
            <option key={status} value={status} className="capitalize">
              {status}
            </option>
          ))}
        </Select>
        <Select
          label="Reading status"
          value={draft.readingStatus}
          onChange={(event) =>
            set('readingStatus', event.target.value as BookQuery['readingStatus'])
          }
        >
          <option value="">Any</option>
          {READING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <Select
          label="Condition"
          value={draft.condition}
          onChange={(event) =>
            set('condition', event.target.value as BookQuery['condition'])
          }
        >
          <option value="">Any</option>
          {CONDITIONS.map((condition) => (
            <option key={condition} value={condition}>
              {condition}
            </option>
          ))}
        </Select>
        <ValueSelect
          label="Author"
          value={draft.author}
          options={options.authors}
          onChange={(value) => set('author', value)}
        />
        <ValueSelect
          label="Publisher"
          value={draft.publisher}
          options={options.publishers}
          onChange={(value) => set('publisher', value)}
        />
        <ValueSelect
          label="Language"
          value={draft.language}
          options={options.languages}
          onChange={(value) => set('language', value)}
        />
        <ValueSelect
          label="Category"
          value={draft.category}
          options={options.categories}
          onChange={(value) => set('category', value)}
        />
        <ValueSelect
          label="Tag"
          value={draft.tag}
          options={options.tags}
          onChange={(value) => set('tag', value)}
        />
        <ValueSelect
          label="Room"
          value={draft.room}
          options={options.rooms}
          onChange={(value) => set('room', value)}
        />
        <ValueSelect
          label="Shelf"
          value={draft.shelf}
          options={options.shelves}
          onChange={(value) => set('shelf', value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Purchased from (year)"
            type="number"
            inputMode="numeric"
            value={draft.yearFrom ?? ''}
            onChange={(event) => set('yearFrom', numberOrNull(event.target.value))}
            placeholder="2015"
          />
          <Input
            label="To (year)"
            type="number"
            inputMode="numeric"
            value={draft.yearTo ?? ''}
            onChange={(event) => set('yearTo', numberOrNull(event.target.value))}
            placeholder="2026"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Min price (NPR)"
            type="number"
            inputMode="numeric"
            value={draft.priceMin ?? ''}
            onChange={(event) => set('priceMin', numberOrNull(event.target.value))}
            placeholder="0"
          />
          <Input
            label="Max price (NPR)"
            type="number"
            inputMode="numeric"
            value={draft.priceMax ?? ''}
            onChange={(event) => set('priceMax', numberOrNull(event.target.value))}
            placeholder="5000"
          />
        </div>
        <div className="sm:col-span-2">
          <Switch
            checked={draft.favorite}
            onChange={(value) => set('favorite', value)}
            label="Favorites only"
          />
        </div>
      </div>
    </Modal>
  );
}
