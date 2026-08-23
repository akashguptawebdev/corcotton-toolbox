import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './TablePagination.module.scss';

const TablePagination = ({
  page = 1,
  pageSize = 8,
  total = 0,
  visibleCount = 0,
  itemLabel = 'records',
  pages = [1, 2, 3],
  lastPage,
  pageSizeOptions = [8, 16, 24],
}) => {
  const end = visibleCount > 0 ? visibleCount : Math.min(pageSize, total);
  const resolvedLastPage = lastPage || Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <span>Showing 1-{end} of {total} {itemLabel}</span>
      <div className={styles.pagination}>
        <button type="button" aria-label="Previous page"><ChevronLeft size={16} /></button>
        {pages.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={pageNumber === page ? styles.activePage : undefined}
          >
            {pageNumber}
          </button>
        ))}
        {resolvedLastPage > Math.max(...pages) + 1 ? <span>...</span> : null}
        {resolvedLastPage > Math.max(...pages) ? <button type="button">{resolvedLastPage}</button> : null}
        <button type="button" aria-label="Next page"><ChevronRight size={16} /></button>
        <select aria-label="Rows per page" defaultValue={pageSize}>
          {pageSizeOptions.map((option) => <option key={option} value={option}>{option} / page</option>)}
        </select>
      </div>
    </>
  );
};

export default TablePagination;
