import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { STATIONS, type Station } from "@/data/stations";

type Props = {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	required?: boolean;
};

const StationAutocomplete = ({ id, value, onChange, placeholder, required }: Props) => {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const matches = useMemo<Station[]>(() => {
		const q = query.trim().toLowerCase();
		if (!q) return STATIONS.slice(0, 50);
		return STATIONS.filter(
			(s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
		)
			.sort((a, b) => {
				const ac = a.code.toLowerCase() === q ? 0 : a.code.toLowerCase().startsWith(q) ? 1 : 3;
				const bc = b.code.toLowerCase() === q ? 0 : b.code.toLowerCase().startsWith(q) ? 1 : 3;
				const an = a.name.toLowerCase().startsWith(q) ? 2 : 4;
				const bn = b.name.toLowerCase().startsWith(q) ? 2 : 4;
				return Math.min(ac, an) - Math.min(bc, bn);
			})
			.slice(0, 60);
	}, [query]);

	const handleSelect = (station: Station) => {
		onChange(station.name);
		setQuery("");
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					id={id}
					type="button"
					aria-required={required}
					className="flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3.5 text-left text-sm text-slate-900 shadow-none focus:outline-none focus:ring-2 focus:ring-slate-200"
				>
					<span className={cn("truncate", !value && "text-slate-400")}>{value || placeholder || "Select station"}</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={6}
				className="w-[var(--radix-popover-trigger-width)] rounded-2xl border-slate-200 p-0 shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
			>
				<div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
					<Search className="h-4 w-4 text-slate-400" />
					<input
						autoFocus
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search by code (NGP) or name"
						className="h-8 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
					/>
				</div>
				<div className="max-h-64 overflow-y-auto py-1">
					{matches.length === 0 ? (
						<p className="px-3 py-6 text-center text-xs text-slate-500">No stations found</p>
					) : (
						matches.map((s) => {
							const selected = value.trim().toLowerCase() === s.name.toLowerCase();
							return (
								<button
									key={`${s.code}-${s.name}`}
									type="button"
									onClick={() => handleSelect(s)}
									className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
								>
									<span className="inline-flex h-6 min-w-[3rem] items-center justify-center rounded-md bg-slate-100 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
										{s.code}
									</span>
									<span className="flex-1 truncate text-slate-800">{s.name}</span>
									{selected && <Check className="h-4 w-4 text-emerald-600" />}
								</button>
							);
						})
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
};

export default StationAutocomplete;
