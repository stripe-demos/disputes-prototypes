/**
 * Generic Table component
 *
 * @param {Object} props
 * @param {Array} props.columns - Column definitions
 *   - key: string - Property key or unique identifier
 *   - header: string - Header text (optional, empty for no header)
 *   - align: 'left' | 'center' | 'right' - Text alignment (default: 'left')
 *   - width: 'grow' | 'hug' - Column sizing (default: 'hug')
 *   - render: (item, index) => ReactNode - Custom render function (optional)
 *   - paddingX: string - Override horizontal padding for this column (e.g., 'px-2')
 * @param {Array} props.data - Array of data items to display
 * @param {Function} props.onRowClick - Click handler for rows (optional)
 * @param {boolean} props.isLoading - Show loading spinner
 * @param {string} props.rowKey - Property to use as React key (default: 'id')
 * @param {string} props.cellPaddingX - Default horizontal padding for cells (default: 'px-4')
 * @param {string} props.emptyStateTitle - Title text for empty state
 * @param {string} props.emptyStateDescription - Description text for empty state
 * @param {ReactNode} props.emptyStateAction - Optional CTA button for empty state
 */
const Table = ({
  columns = [],
  data = [],
  onRowClick,
  isLoading = false,
  rowKey = 'id',
  cellPaddingX = 'px-4',
  emptyStateTitle = null,
  emptyStateDescription = null,
  emptyStateAction = null,
}) => {
  // Get alignment class for header/cell
  const getAlignClass = (align) => {
    switch (align) {
      case 'right': return 'text-right';
      case 'center': return 'text-center';
      default: return 'text-left';
    }
  };

  // Get width class for header/cell (default: hug)
  const getWidthClass = (width) => {
    return width === 'grow' ? '' : 'w-1 whitespace-nowrap';
  };

  // Render cell content
  const renderCell = (column, item, index) => {
    if (column.render) {
      return column.render(item, index);
    }
    return item[column.key];
  };

  // Loading spinner
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center">
      <div className="w-6 h-6 border-2 rounded-full animate-spin border-border border-border" />
    </div>
  );

  // Check if data is empty (used for consistent loading/empty state layout)
  const isDataEmpty = data.length === 0;

  // Empty state content component - centered in a dotted border container
  const EmptyStateContent = () => (
    <div className="border border-dashed border-border rounded-lg py-16 px-8 flex flex-col items-center justify-center">
      {emptyStateTitle && (
        <div className="text-body-medium-emphasized text-default">{emptyStateTitle}</div>
      )}
      {emptyStateDescription && (
        <div className="text-body-small mt-1 text-subdued">{emptyStateDescription}</div>
      )}
      {emptyStateAction && <div className="mt-4">{emptyStateAction}</div>}
    </div>
  );

  return (
    <div>
      {/* Table */}
      <div className="rounded-lg overflow-hidden">
        {/* Show table with headers only when data exists, otherwise show empty/loading state */}
        {isDataEmpty ? (
          <div className={isLoading ? "py-24 text-center" : ""}>
            {isLoading ? <LoadingSpinner /> : <EmptyStateContent />}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-50">
                {columns.map((column, colIndex) => (
                  <th
                    key={column.key || colIndex}
                    className={`py-3 ${column.paddingX || cellPaddingX} text-label-small-emphasized text-default ${getAlignClass(column.align)} ${getWidthClass(column.width)}`}
                  >
                    {column.header || ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="py-32">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : (
                data.map((item, rowIndex) => (
                  <tr
                    key={item[rowKey] ?? rowIndex}
                    className={`border-b text-body-small text-subdued border-neutral-50 hover:bg-neutral-50/50 transition-colors duration-100 ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick?.(item, rowIndex)}
                  >
                    {columns.map((column, colIndex) => (
                      <td
                        key={column.key || colIndex}
                        className={`py-1 ${column.paddingX || cellPaddingX} h-[32px] ${getAlignClass(column.align)} ${getWidthClass(column.width)}`}
                      >
                        {renderCell(column, item, rowIndex)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Table;
