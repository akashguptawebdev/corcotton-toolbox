import clsx from 'clsx';
import styles from './DataTable.module.scss';

const getRowId = (row, index, rowKey) => {
  if (typeof rowKey === 'function') return rowKey(row);
  return row?.[rowKey] ?? row?.id ?? index;
};

const DataTable = ({
  columns,
  rows,
  rowKey = 'id',
  loading = false,
  emptyText = 'No records found.',
  selectedIds = [],
  onSelectionChange,
  footer,
  className,
}) => {
  const selectable = typeof onSelectionChange === 'function';
  const selectedSet = new Set(selectedIds.map(String));
  const visibleIds = rows.map((row, index) => String(getRowId(row, index, rowKey)));
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !visibleIds.includes(String(id))));
      return;
    }

    onSelectionChange(Array.from(new Set([...selectedIds.map(String), ...visibleIds])));
  };

  const toggleRow = (id) => {
    const normalizedId = String(id);
    onSelectionChange(
      selectedSet.has(normalizedId)
        ? selectedIds.filter((selectedId) => String(selectedId) !== normalizedId)
        : [...selectedIds, normalizedId]
    );
  };

  return (
    <section className={clsx(styles.tableCard, className)}>
      <div className={styles.scrollArea}>
        <table className={styles.table}>
          <thead>
            <tr>
              {selectable ? (
                <th className={styles.selectCell}>
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
              ) : null}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(column.align === 'right' && styles.alignRight, column.className)}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className={styles.emptyCell}>Loading...</td>
              </tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className={styles.emptyCell}>{emptyText}</td>
              </tr>
            ) : null}
            {!loading && rows.map((row, rowIndex) => {
              const id = getRowId(row, rowIndex, rowKey);
              const normalizedId = String(id);

              return (
                <tr key={normalizedId}>
                  {selectable ? (
                    <td className={styles.selectCell}>
                      <input
                        type="checkbox"
                        aria-label={`Select row ${rowIndex + 1}`}
                        checked={selectedSet.has(normalizedId)}
                        onChange={() => toggleRow(normalizedId)}
                      />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td key={column.key} className={clsx(column.align === 'right' && styles.alignRight, column.cellClassName)}>
                      {column.render ? column.render(row, rowIndex) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer ? <footer className={styles.footer}>{footer}</footer> : null}
    </section>
  );
};

export default DataTable;
