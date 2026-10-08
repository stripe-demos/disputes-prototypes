import TimelineItem from './TimelineItem';

/**
 * Renders a list of TimelineItems, each drawing its own connecting-line
 * segments and bottom divider. Pass `sortOrder="none"` to render `items` in
 * the exact order given; otherwise items are sorted by `sortTimestamp` (a Date).
 */
const Timeline = ({ items, sortOrder = 'desc' }) => {
  const ordered =
    sortOrder === 'none'
      ? items
      : [...items].sort((a, b) =>
          sortOrder === 'desc' ? b.sortTimestamp - a.sortTimestamp : a.sortTimestamp - b.sortTimestamp
        );

  return (
    <div>
      {ordered.map((item, i) => (
        <TimelineItem key={item.id} {...item} isFirst={i === 0} isLast={i === ordered.length - 1} />
      ))}
    </div>
  );
};

export default Timeline;
