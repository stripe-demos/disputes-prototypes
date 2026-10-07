export default function BrowserWindow({ url, children }) {
  return (
    <div className="h-full bg-[#E8EAED] flex items-center justify-center p-6">
      <div className="w-full max-w-[1200px] h-full max-h-[760px] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden border border-black/10 bg-surface flex flex-col">
        {/* Fake browser chrome */}
        <div className="h-10 bg-neutral-100 border-b border-border flex items-center gap-2 px-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#FF5F57]" />
            <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="size-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="text-label-small text-subdued bg-surface border border-border rounded-full px-4 py-1 max-w-[320px] w-full text-center truncate">
              {url}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
