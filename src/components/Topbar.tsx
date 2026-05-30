import { Printer, Share2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface TopbarProps {
  onShare: () => void
  onPrint: () => void
}

export function Topbar({ onShare, onPrint }: TopbarProps) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="px-4 py-3 md:px-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            aria-hidden="true"
            className="h-7 w-7 rounded-md"
          />
          <div className="font-semibold text-slate-900 text-[15px]">
            offerlens
          </div>
          <Badge
            variant="secondary"
            className="ml-1 text-[10px] font-medium tracking-wide"
          >
            beta
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share2 size={14} />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer size={14} />
            Print
          </Button>
        </div>
      </div>
    </header>
  )
}
