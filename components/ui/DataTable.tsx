'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
  actions?: (row: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'بحث...',
  pageSize = 10,
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q))
    );
  }, [data, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const getValue = (row: T, key: string): unknown => {
    return key.split('.').reduce((o, k) => (o as Record<string, unknown>)?.[k], row as unknown);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {searchable && (
        <div className="relative group max-w-md">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="ps-11 h-12 rounded-2xl bg-muted/30 border-muted-foreground/10 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
        </div>
      )}

      <div className="rounded-[2rem] border border-muted/50 overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm transition-all">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-start border-collapse">
            <thead className="bg-muted/30 border-b border-muted/50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className={cn(
                      'px-6 py-5 text-start font-bold text-muted-foreground uppercase tracking-widest text-[10px]',
                      col.sortable && 'cursor-pointer select-none hover:text-primary transition-colors',
                      col.className
                    )}
                    onClick={() => col.sortable && toggleSort(String(col.key))}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.sortable && sortKey === String(col.key) && (
                        <div className="bg-primary/10 p-1 rounded">
                          {sortDir === 'asc'
                            ? <ChevronUp className="h-3 w-3 text-primary" />
                            : <ChevronDown className="h-3 w-3 text-primary" />
                          }
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                {actions && <th className="px-6 py-5 text-start font-bold text-muted-foreground uppercase tracking-widest text-[10px]">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-6 py-5">
                        <div className="h-4 bg-muted/50 animate-pulse rounded-full w-full" />
                      </td>
                    ))}
                    {actions && <td className="px-6 py-5"><div className="h-4 w-12 bg-muted/50 animate-pulse rounded-full" /></td>}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-20 text-center text-muted-foreground font-medium">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-muted p-4 rounded-full">
                        <Search className="h-8 w-8 opacity-20" />
                      </div>
                      {emptyMessage}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => (
                  <tr key={i} className="group hover:bg-primary/5 transition-colors cursor-default">
                    {columns.map((col) => (
                      <td key={String(col.key)} className={cn('px-6 py-5 font-medium', col.className)}>
                        {col.render
                          ? col.render(getValue(row, String(col.key)), row)
                          : <span className="text-foreground/80">{String(getValue(row, String(col.key)) ?? '—')}</span>}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-6 py-5">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          {actions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Showing <span className="text-foreground">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)}</span> of <span className="text-foreground">{sorted.length}</span> results
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage((p) => Math.max(1, p - 1))} 
              disabled={page === 1}
              className="rounded-xl border-muted-foreground/10 h-9 font-bold text-xs px-4"
            >
              <ChevronRight className="h-4 w-4 me-1" /> السابق
            </Button>
            <div className="flex h-9 min-w-[36px] items-center justify-center rounded-xl bg-primary/10 text-primary font-black text-xs">
              {page}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
              className="rounded-xl border-muted-foreground/10 h-9 font-bold text-xs px-4"
            >
              التالي <ChevronLeft className="h-4 w-4 ms-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
