import { useNavigate } from 'react-router-dom';
import { Download, FileDown, FileJson, FileSpreadsheet, Printer } from 'lucide-react';
import type { Book } from '@/types/book';
import { BOOK_COLUMNS } from '@/lib/columns';
import { booksToCsv, downloadFile } from '@/lib/csv';
import { todayIso } from '@/lib/format';
import { library } from '@/data/libraryService';
import { Menu } from '@/components/ui/Menu';
import { useToast } from '@/components/ui/Toast';

/**
 * Export the current (filtered) list. Excel support is loaded on demand so
 * SheetJS never weighs down the main bundle; PDF is delivered through the
 * print stylesheet (system “Save as PDF”), which needs no dependency and
 * matches what a printed catalogue should look like.
 */
export function ExportMenu({
  books,
  printSearch,
}: {
  books: Book[];
  printSearch: string;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const stamp = todayIso();

  const exportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = books.map((book) =>
        Object.fromEntries(BOOK_COLUMNS.map((col) => [col.header, col.toCell(book)])),
      );
      const sheet = XLSX.utils.json_to_sheet(rows, {
        header: BOOK_COLUMNS.map((col) => col.header),
      });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'Books');
      XLSX.writeFile(workbook, `library-${stamp}.xlsx`);
    } catch {
      toast('Excel export could not load — try the CSV export instead.', {
        kind: 'error',
      });
    }
  };

  return (
    <Menu
      label="Export"
      icon={<Download size={15} />}
      items={[
        {
          label: `CSV (${books.length} books)`,
          icon: <FileDown size={15} />,
          onSelect: () =>
            downloadFile(`library-${stamp}.csv`, booksToCsv(books), 'text/csv;charset=utf-8'),
        },
        {
          label: 'Excel (.xlsx)',
          icon: <FileSpreadsheet size={15} />,
          onSelect: () => void exportExcel(),
        },
        {
          label: 'Full backup (JSON)',
          icon: <FileJson size={15} />,
          onSelect: () =>
            void library
              .exportBackup()
              .then((json) =>
                downloadFile(`library-backup-${stamp}.json`, json, 'application/json'),
              ),
        },
        {
          label: 'Print / save as PDF',
          icon: <Printer size={15} />,
          onSelect: () => navigate(`/print${printSearch ? `?${printSearch}` : ''}`),
        },
      ]}
    />
  );
}
