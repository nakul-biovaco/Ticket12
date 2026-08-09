import { useState } from "react";
import { CheckCircle2, Download, HardDrive, ShieldAlert, Sparkles, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface OnboardingModalProps {
	open: boolean;
	onAccept: () => void;
}

export const OnboardingModal = ({ open, onAccept }: OnboardingModalProps) => {
	const [language, setLanguage] = useState<"hinglish" | "english">("hinglish");

	return (
		<Dialog open={open} onOpenChange={() => {}}>
			<DialogContent
				onPointerDownOutside={(e) => e.preventDefault()}
				onEscapeKeyDown={(e) => e.preventDefault()}
				className="left-1/2 top-[50%] w-[calc(100%-1rem)] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-[1.75rem] border-0 bg-white p-0 shadow-[0_28px_70px_rgba(15,23,42,0.25)] focus:outline-none"
			>
				<div className="space-y-4 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:space-y-5 sm:px-6 sm:py-6">
					<DialogHeader className="space-y-2 text-left">
						<div className="flex items-center justify-between">
							<div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
								<Sparkles className="h-3.5 w-3.5 text-emerald-600" />
								<span>{language === "hinglish" ? "Pehli Baar User Guide" : "First-Time User Guide"}</span>
							</div>

							<div className="inline-flex rounded-full bg-slate-100 p-1">
								<button
									type="button"
									onClick={() => setLanguage("hinglish")}
									className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
										language === "hinglish" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
									}`}
								>
									Hinglish
								</button>
								<button
									type="button"
									onClick={() => setLanguage("english")}
									className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
										language === "english" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
									}`}
								>
									English
								</button>
							</div>
						</div>

						<DialogTitle className="text-xl font-bold text-slate-900 sm:text-2xl">
							{language === "hinglish" ? "Welcome & Guide" : "Welcome & Quick Summary"}
						</DialogTitle>
						<DialogDescription className="text-xs leading-relaxed text-slate-500 sm:text-sm">
							{language === "hinglish"
								? "App ko use karne se pehle ye important points dhyan se samajh lein."
								: "Please read these important instructions carefully before proceeding."}
						</DialogDescription>
					</DialogHeader>

					<div className="max-h-[55vh] space-y-3.5 overflow-y-auto pr-1">
						{/* Point 1: App Working */}
						<div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1.5">
							<div className="flex items-center gap-2 text-slate-900 font-semibold text-xs sm:text-sm">
								<Ticket className="h-4 w-4 text-emerald-600 shrink-0" />
								<span>{language === "hinglish" ? "1. App Kaise Kaam Karta Hai?" : "1. How the App Works"}</span>
							</div>
							<p className="text-[12px] leading-relaxed text-slate-600 pl-6 sm:text-xs">
								{language === "hinglish"
									? "Source & Destination select karein ➔ Full Name, Age, ID details bharein ➔ Terms accept karke password daalein (First Name + Age) ➔ Dynamic ticket instant generate ho jayega."
									: "Select Source & Destination ➔ Fill Passenger & ID details ➔ Accept Terms & Enter password (First Name + Age) ➔ Instant persistent ticket is generated."}
							</p>
						</div>

						{/* Point 2: Offline & PWA */}
						<div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1.5">
							<div className="flex items-center gap-2 text-slate-900 font-semibold text-xs sm:text-sm">
								<Download className="h-4 w-4 text-blue-600 shrink-0" />
								<span>{language === "hinglish" ? "2. Fully Offline & PWA Install" : "2. Fully Offline & PWA Installation"}</span>
							</div>
							<p className="text-[12px] leading-relaxed text-slate-600 pl-6 sm:text-xs">
								{language === "hinglish"
									? "App ko Mobile/Desktop browser se 'Install' kar sakte hain. Submitting ke baad network ki koi zaroorat nahi hai, yeh 100% offline kaam karta hai."
									: "Install the app on mobile or desktop via PWA button. Once setup, it functions 100% offline without requiring internet."}
							</p>
						</div>

						{/* Point 3: Data Persistence & Lock */}
						<div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1.5">
							<div className="flex items-center gap-2 text-slate-900 font-semibold text-xs sm:text-sm">
								<HardDrive className="h-4 w-4 text-purple-600 shrink-0" />
								<span>{language === "hinglish" ? "3. Local Database & Ticket Lock" : "3. Local Database & Ticket Lock"}</span>
							</div>
							<p className="text-[12px] leading-relaxed text-slate-600 pl-6 sm:text-xs">
								{language === "hinglish"
									? "Data aapke browser ke Local Database (IndexedDB) me save rehta hai. Jab tak aap top-left Back (←) button nahi dabate, ticket locked rahega aur reload karne par bhi form par nahi jayega."
									: "Data is saved in browser IndexedDB. Until you explicitly click the top-left Back (←) button, you remain locked on the ticket view across all reloads."}
							</p>
						</div>

						{/* Point 4: Terms & Safety */}
						<div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5 space-y-1.5">
							<div className="flex items-center gap-2 text-amber-900 font-semibold text-xs sm:text-sm">
								<ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
								<span>{language === "hinglish" ? "4. Terms & Disclaimer" : "4. Terms & Legal Disclaimer"}</span>
							</div>
							<p className="text-[12px] leading-relaxed text-amber-800/90 pl-6 sm:text-xs">
								{language === "hinglish"
									? "Yeh app sirf mockup, prototype, aur visual backup demonstration ke liye hai. Yatra ke liye hamesha authorized IRCTC / station window se valid official ticket lein."
									: "This app is strictly for UI mockup, prototype, and visual backup demonstration. Always purchase valid official travel tickets via authorized channels."}
							</p>
						</div>
					</div>

					<DialogFooter className="pt-2">
						<Button
							type="button"
							onClick={onAccept}
							className="h-12 w-full rounded-full !bg-[#31a24c] !text-white text-sm font-semibold shadow-[0_14px_30px_rgba(49,162,76,0.28)] hover:!bg-[#299043] active:scale-[0.99] flex items-center justify-center gap-2"
						>
							<CheckCircle2 className="h-4 w-4" />
							<span>{language === "hinglish" ? "Samajh Gaya - Continue Karein" : "I Understand & Accept"}</span>
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
};
