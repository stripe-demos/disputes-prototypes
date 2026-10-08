/**
 * A single row in a Timeline: a marker column (dot + connecting line segments
 * above/below it) and an entry column (title, optional subcopy, timestamp)
 * separated from the next row by a bottom border.
 */
const TimelineItem = ({ title, subcopy, timestamp, isFirst = false, isLast = false }) => (
  <div className="flex gap-4 items-start">
    <div className="relative self-stretch shrink-0 w-[10px]">
      {!isFirst && <div className="absolute left-1/2 -translate-x-1/2 top-0 h-[14px] w-px bg-border" />}
      {!isLast && <div className="absolute left-1/2 -translate-x-1/2 top-[24px] bottom-0 w-px bg-border" />}
      <span className="absolute left-1/2 -translate-x-1/2 top-[14px] size-[10px] rounded-full bg-surface border border-border" />
    </div>
    <div className="flex-1 min-w-0 flex items-start justify-between gap-4 py-2 border-b border-border">
      <div>
        <p className="text-label-medium-emphasized text-default">{title}</p>
        {subcopy && <p className="text-body-small text-subdued mt-0.5">{subcopy}</p>}
      </div>
      <p className="text-body-small text-subdued shrink-0 whitespace-nowrap">{timestamp}</p>
    </div>
  </div>
);

export default TimelineItem;
