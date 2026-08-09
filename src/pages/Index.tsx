import { useEffect, useMemo, useState } from "react";
import { HelpCircle } from "lucide-react";

import BookingDetails, { generateTicketCode, type PassengerDetails } from "@/components/BookingDetails";
import { OnboardingModal } from "@/components/OnboardingModal";
import StationAutocomplete from "@/components/StationAutocomplete";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { dbService, type TicketRecord } from "@/services/dbService";

const STATION_COORDINATES: Record<string, { lat: number; lon: number }> = {
	ajni: { lat: 21.1282, lon: 79.0882 },
	amravati: { lat: 20.9374, lon: 77.7796 },
	andheri: { lat: 19.1197, lon: 72.8468 },
	bandra: { lat: 19.0544, lon: 72.8406 },
	bengaluru: { lat: 12.9716, lon: 77.5946 },
	bhopal: { lat: 23.2599, lon: 77.4126 },
	chandrapur: { lat: 19.9615, lon: 79.2961 },
	chennai: { lat: 13.0827, lon: 80.2707 },
	dadar: { lat: 19.018, lon: 72.8432 },
	delhi: { lat: 28.6139, lon: 77.209 },
	dhamangaon: { lat: 20.7831, lon: 78.0029 },
	"dhandari kalan": { lat: 30.8612, lon: 75.9237 },
	gondia: { lat: 21.4602, lon: 80.1982 },
	howrah: { lat: 22.5958, lon: 88.2636 },
	hyderabad: { lat: 17.385, lon: 78.4867 },
	itarsi: { lat: 22.6147, lon: 77.7622 },
	jabalpur: { lat: 23.1815, lon: 79.9864 },
	kanpur: { lat: 26.4499, lon: 80.3319 },
	kolkata: { lat: 22.5726, lon: 88.3639 },
	"lokmanya tilak terminus": { lat: 19.0661, lon: 72.8894 },
	ludhiana: { lat: 30.9006, lon: 75.8573 },
	"ludhiana jn": { lat: 30.9161, lon: 75.8481 },
	mumbai: { lat: 19.076, lon: 72.8777 },
	nagpur: { lat: 21.1458, lon: 79.0882 },
	nashik: { lat: 19.9975, lon: 73.7898 },
	"new delhi": { lat: 28.6425, lon: 77.2197 },
	pune: { lat: 18.5204, lon: 73.8567 },
	sevagram: { lat: 20.7343, lon: 78.5822 },
	surat: { lat: 21.1702, lon: 72.8311 },
	thane: { lat: 19.2183, lon: 72.9781 },
	vadodara: { lat: 22.3072, lon: 73.1812 },
	wardha: { lat: 20.7453, lon: 78.6022 },
};

const initialPassenger: PassengerDetails = {
	name: "",
	age: "",
	idType: "PAN",
	idNumber: "",
	source: "Dhamangaon",
	destination: "Nagpur",
	distance: "116",
};

type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const normalizeStationName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const toRadians = (value: number) => (value * Math.PI) / 180;

const calculateDistanceKm = (source: string, destination: string) => {
	const sourceStation = STATION_COORDINATES[normalizeStationName(source)];
	const destinationStation = STATION_COORDINATES[normalizeStationName(destination)];

	if (!sourceStation || !destinationStation) {
		if (!source.trim() || !destination.trim()) return null;
		let hash = 0;
		const combined = normalizeStationName(source) + normalizeStationName(destination);
		for (let i = 0; i < combined.length; i++) {
			hash = (hash << 5) - hash + combined.charCodeAt(i);
			hash |= 0;
		}
		const estimatedKm = Math.abs(hash % 380) + 35;
		return String(estimatedKm);
	}

	const earthRadiusKm = 6371;
	const latitudeDelta = toRadians(destinationStation.lat - sourceStation.lat);
	const longitudeDelta = toRadians(destinationStation.lon - sourceStation.lon);
	const sourceLatitude = toRadians(sourceStation.lat);
	const destinationLatitude = toRadians(destinationStation.lat);

	const haversine =
		Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
		Math.cos(sourceLatitude) *
			Math.cos(destinationLatitude) *
			Math.sin(longitudeDelta / 2) *
			Math.sin(longitudeDelta / 2);

	const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
	return String(Math.round(earthRadiusKm * arc));
};

const Index = () => {
	const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !dbService.getHasSeenOnboardingSync());
	const [draftPassenger, setDraftPassenger] = useState<PassengerDetails>(() =>
		dbService.getDraftPassengerSync(initialPassenger),
	);
	const [ticketRecord, setTicketRecord] = useState<TicketRecord | null>(() =>
		dbService.getTicketRecordSync(),
	);
	const [pendingPassenger, setPendingPassenger] = useState<PassengerDetails | null>(null);
	const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
	const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
	const [distanceTouched, setDistanceTouched] = useState(false);
	const [enteredPassword, setEnteredPassword] = useState("");
	const [passwordError, setPasswordError] = useState("");
	const [termsAccepted, setTermsAccepted] = useState(false);
	const [termsLanguage, setTermsLanguage] = useState<"english" | "hinglish">("english");
	const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
	const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
	const [isAppInstalled, setIsAppInstalled] = useState(false);

	const handleAcceptOnboarding = () => {
		dbService.setHasSeenOnboarding(true);
		setShowOnboarding(false);
	};

	// Async IndexedDB hydration check
	useEffect(() => {
		dbService.getTicketRecordAsync().then((record) => {
			if (record && !ticketRecord) {
				setTicketRecord(record);
			}
		});
	}, [ticketRecord]);

	// Handle popstate for browser/device back button
	useEffect(() => {
		if (ticketRecord) {
			window.history.pushState({ ticketPage: true }, "");
			const handlePopState = () => {
				handleBackoutFromTicket();
			};
			window.addEventListener("popstate", handlePopState);
			return () => {
				window.removeEventListener("popstate", handlePopState);
			};
		}
	}, [ticketRecord]);

	useEffect(() => {
		const markOnline = () => setIsOnline(true);
		const markOffline = () => setIsOnline(false);

		window.addEventListener("online", markOnline);
		window.addEventListener("offline", markOffline);

		return () => {
			window.removeEventListener("online", markOnline);
			window.removeEventListener("offline", markOffline);
		};
	}, []);

	useEffect(() => {
		const inStandaloneMode =
			window.matchMedia("(display-mode: standalone)").matches ||
			(window.navigator as Navigator & { standalone?: boolean }).standalone === true;
		setIsAppInstalled(inStandaloneMode);

		const handleBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
		};

		const handleAppInstalled = () => {
			setIsAppInstalled(true);
			setDeferredInstallPrompt(null);
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
		window.addEventListener("appinstalled", handleAppInstalled);

		return () => {
			window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
			window.removeEventListener("appinstalled", handleAppInstalled);
		};
	}, []);

	const localAutoDistance = useMemo(
		() => calculateDistanceKm(draftPassenger.source, draftPassenger.destination),
		[draftPassenger.source, draftPassenger.destination],
	);

	const [apiDistance, setApiDistance] = useState<string | null>(null);
	const [isFetchingDistance, setIsFetchingDistance] = useState(false);

	useEffect(() => {
		dbService.saveDraftPassenger(draftPassenger);
	}, [draftPassenger]);

	useEffect(() => {
		if (!isOnline) {
			setApiDistance(null);
			setIsFetchingDistance(false);
			return;
		}

		const source = draftPassenger.source.trim();
		const destination = draftPassenger.destination.trim();
		if (!source || !destination) {
			setApiDistance(null);
			return;
		}

		let cancelled = false;
		const controller = new AbortController();
		const timer = window.setTimeout(async () => {
			setIsFetchingDistance(true);
			try {
				const geocode = async (query: string) => {
					const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query + " railway station, India")}`;
					const res = await fetch(url, { signal: controller.signal, headers: { "Accept-Language": "en" } });
					if (!res.ok) throw new Error("geocode failed");
					const data = await res.json();
					if (!Array.isArray(data) || data.length === 0) {
						const fb = await fetch(
							`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`,
							{ signal: controller.signal, headers: { "Accept-Language": "en" } },
						);
						const fbData = await fb.json();
						if (!Array.isArray(fbData) || fbData.length === 0) throw new Error("no results");
						return { lat: parseFloat(fbData[0].lat), lon: parseFloat(fbData[0].lon) };
					}
					return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
				};

				const [src, dst] = await Promise.all([geocode(source), geocode(destination)]);
				const R = 6371;
				const toRad = (v: number) => (v * Math.PI) / 180;
				const dLat = toRad(dst.lat - src.lat);
				const dLon = toRad(dst.lon - src.lon);
				const a =
					Math.sin(dLat / 2) ** 2 +
					Math.cos(toRad(src.lat)) * Math.cos(toRad(dst.lat)) * Math.sin(dLon / 2) ** 2;
				const greatCircleKm = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
				const railKm = Math.round(greatCircleKm * 1.18);
				if (cancelled) return;
				setApiDistance(String(railKm));
			} catch {
				if (!cancelled) setApiDistance(null);
			} finally {
				if (!cancelled) setIsFetchingDistance(false);
			}
		}, 600);

		return () => {
			cancelled = true;
			controller.abort();
			window.clearTimeout(timer);
		};
	}, [draftPassenger.source, draftPassenger.destination, isOnline]);

	const handleInstallApp = async () => {
		if (!deferredInstallPrompt) return;
		await deferredInstallPrompt.prompt();
		await deferredInstallPrompt.userChoice;
		setDeferredInstallPrompt(null);
	};

	const autoDistance = apiDistance ?? localAutoDistance;
	const resolvedDistance = autoDistance ?? draftPassenger.distance;
	const isAutoDistanceAvailable = Boolean(autoDistance);

	const updateField = (field: keyof PassengerDetails, value: string) => {
		setDraftPassenger((current) => {
			const nextPassenger = { ...current, [field]: value };

			if (field === "source" || field === "destination") {
				const nextAutoDistance = calculateDistanceKm(
					field === "source" ? value : nextPassenger.source,
					field === "destination" ? value : nextPassenger.destination,
				);

				if (nextAutoDistance) {
					nextPassenger.distance = nextAutoDistance;
				} else if (!distanceTouched) {
					nextPassenger.distance = "";
				}
			}

			return nextPassenger;
		});
	};

	const buildPassword = (passenger: PassengerDetails) => {
		const firstName = passenger.name.trim().split(/\s+/)[0] ?? "";
		return `${firstName}${passenger.age.trim()}`.replace(/\s+/g, "");
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const normalizedPassenger = {
			name: draftPassenger.name.trim(),
			age: draftPassenger.age.trim(),
			idType: draftPassenger.idType.trim(),
			idNumber: draftPassenger.idNumber.trim(),
			source: draftPassenger.source.trim(),
			destination: draftPassenger.destination.trim(),
			distance: resolvedDistance.trim(),
		};

		setPendingPassenger(normalizedPassenger);
		setEnteredPassword("");
		setPasswordError("");
		setTermsAccepted(false);
		setTermsLanguage("english");
		setIsTermsDialogOpen(true);
	};

	const handleContinueFromTerms = () => {
		if (!termsAccepted) return;
		setIsTermsDialogOpen(false);
		setIsPasswordDialogOpen(true);
	};

	const handleContinueToTicket = () => {
		if (!pendingPassenger) return;
		const expectedPassword = buildPassword(pendingPassenger);
		if (enteredPassword.trim() !== expectedPassword) {
			setPasswordError("Incorrect password. Enter first name + age without spaces.");
			return;
		}

		const newRecord: TicketRecord = {
			passenger: pendingPassenger,
			ticketCode: generateTicketCode(),
			bookedOnTimestamp: Date.now(),
		};

		setDraftPassenger(pendingPassenger);
		setTicketRecord(newRecord);
		dbService.saveTicketRecord(newRecord);

		setIsPasswordDialogOpen(false);
	};

	const handleBackoutFromTicket = () => {
		if (ticketRecord) {
			setDraftPassenger(ticketRecord.passenger);
		}
		setTicketRecord(null);
		dbService.clearTicketRecord();
	};

	const handlePasswordDialogChange = (open: boolean) => {
		setIsPasswordDialogOpen(open);
		if (!open) {
			setPendingPassenger(null);
			setEnteredPassword("");
			setPasswordError("");
			setTermsAccepted(false);
			setTermsLanguage("english");
		}
	};

	const handleTermsDialogChange = (open: boolean) => {
		setIsTermsDialogOpen(open);
		if (!open && !isPasswordDialogOpen) {
			setPendingPassenger(null);
			setTermsAccepted(false);
			setTermsLanguage("english");
		}
	};

	// Until user explicitly backs out, stay on ticket page permanently across reloads
	if (ticketRecord) {
		return (
			<>
				<OnboardingModal open={showOnboarding} onAccept={handleAcceptOnboarding} />
				<BookingDetails ticketRecord={ticketRecord} onEdit={handleBackoutFromTicket} />
			</>
		);
	}

	return (
		<>
			<OnboardingModal open={showOnboarding} onAccept={handleAcceptOnboarding} />

			<div className="min-h-screen bg-[#edf1f5] px-3 py-4 sm:px-5 sm:py-6">
				<div className="mx-auto w-full max-w-md">
					{deferredInstallPrompt && !isAppInstalled ? (
						<div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mb-4 sm:p-3.5">
							<div className="flex items-center justify-between gap-3">
								<p className="text-xs font-medium text-slate-600 sm:text-sm">Install app for full offline use</p>
								<Button
									type="button"
									onClick={handleInstallApp}
									className="h-8 rounded-full !bg-[#31a24c] px-4 text-xs font-semibold text-white hover:!bg-[#299043] sm:h-9"
								>
									Install
								</Button>
							</div>
						</div>
					) : null}
					<Card className="overflow-hidden border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
						<CardHeader className="space-y-2 border-b border-slate-100 px-4 py-4 text-left sm:px-5 sm:py-5">
							<div className="flex items-center justify-between gap-2">
								<CardTitle className="text-[1.35rem] font-semibold leading-tight text-slate-900 sm:text-[1.6rem]">Enter Passenger Details</CardTitle>
								<button
									type="button"
									onClick={() => setShowOnboarding(true)}
									className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
									title="App Guide & Terms"
								>
									<HelpCircle className="h-5 w-5" />
								</button>
							</div>
							<CardDescription className="text-[13px] leading-relaxed text-slate-500 sm:text-sm">
								Fill in the passenger and journey details. A password card will open after submission.
							</CardDescription>
						</CardHeader>

						<CardContent className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
							<form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
								<div className="space-y-3.5 sm:space-y-4">
									<div className="space-y-2 text-left">
										<Label htmlFor="source" className="text-sm font-medium text-slate-700">Source Station</Label>
										<StationAutocomplete
											id="source"
											placeholder="Search e.g. NGP or Nagpur"
											value={draftPassenger.source}
											onChange={(value) => updateField("source", value)}
											required
										/>
									</div>

									<div className="space-y-2 text-left">
										<Label htmlFor="destination" className="text-sm font-medium text-slate-700">Destination Station</Label>
										<StationAutocomplete
											id="destination"
											placeholder="Search e.g. DMN or Dhamangaon"
											value={draftPassenger.destination}
											onChange={(value) => updateField("destination", value)}
											required
										/>
									</div>

									<div className="space-y-2 text-left">
										<Label htmlFor="distance" className="text-sm font-medium text-slate-700">Distance (km)</Label>
										<Input
											id="distance"
											type="number"
											min="1"
											placeholder="Auto calculated"
											value={resolvedDistance}
											onChange={(event) => {
												setDistanceTouched(true);
												updateField("distance", event.target.value);
											}}
											readOnly={isAutoDistanceAvailable}
											required
											className="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3.5 text-sm shadow-none read-only:cursor-default read-only:bg-slate-100"
										/>
										<p className="text-[11px] leading-relaxed text-slate-500 sm:text-xs">
											{!isOnline
												? "Offline mode: distance calculated locally."
												: isFetchingDistance
												? "Fetching railway-route distance…"
												: isAutoDistanceAvailable
													? "Distance estimated from railway route."
													: "Enter distance manually."}
										</p>
									</div>
								</div>

								<div className="space-y-3.5 rounded-[1.25rem] bg-slate-50 p-3.5 sm:space-y-4 sm:p-4">
									<div className="space-y-2 text-left">
										<Label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</Label>
										<Input
											id="name"
											placeholder="Enter passenger name"
											value={draftPassenger.name}
											onChange={(event) => updateField("name", event.target.value)}
											required
											className="h-11 rounded-2xl border-slate-200 bg-white px-3.5 text-sm shadow-none"
										/>
									</div>

									<div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
										<div className="space-y-2 text-left">
											<Label htmlFor="age" className="text-sm font-medium text-slate-700">Age</Label>
											<Input
												id="age"
												type="number"
												min="1"
												placeholder="27"
												value={draftPassenger.age}
												onChange={(event) => updateField("age", event.target.value)}
												required
												className="h-11 rounded-2xl border-slate-200 bg-white px-3.5 text-sm shadow-none"
											/>
										</div>

										<div className="space-y-2 text-left">
											<Label htmlFor="idType" className="text-sm font-medium text-slate-700">ID Type</Label>
											<Input
												id="idType"
												placeholder="PAN"
												value={draftPassenger.idType}
												onChange={(event) => updateField("idType", event.target.value)}
												required
												className="h-11 rounded-2xl border-slate-200 bg-white px-3.5 text-sm shadow-none"
											/>
										</div>
									</div>

									<div className="space-y-2 text-left">
										<Label htmlFor="idNumber" className="text-sm font-medium text-slate-700">ID Number</Label>
										<Input
											id="idNumber"
											placeholder="DTCPM8667P"
											value={draftPassenger.idNumber}
											onChange={(event) => updateField("idNumber", event.target.value)}
											required
											className="h-11 rounded-2xl border-slate-200 bg-white px-3.5 text-sm shadow-none"
										/>
									</div>
								</div>

								<div className="sticky bottom-0 z-10 -mx-2 rounded-t-[1.4rem] bg-gradient-to-t from-white via-white to-white/85 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-1 sm:rounded-2xl sm:bg-white/95 sm:px-1 sm:pb-1 sm:pt-2">
									<Button
										type="submit"
										className="h-12 w-full rounded-full !bg-[#31a24c] !text-white text-sm font-semibold shadow-[0_14px_30px_rgba(49,162,76,0.28)] hover:!bg-[#299043] active:scale-[0.99]"
									>
										Continue
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</div>
			</div>

			<Dialog open={isTermsDialogOpen} onOpenChange={handleTermsDialogChange}>
				<DialogContent className="left-1/2 top-auto bottom-0 w-[calc(100%-0.75rem)] max-w-sm translate-x-[-50%] translate-y-0 rounded-t-[1.75rem] rounded-b-none border-0 bg-white p-0 shadow-[0_-18px_45px_rgba(15,23,42,0.18)] sm:top-[50%] sm:bottom-auto sm:w-[calc(100%-1rem)] sm:max-w-sm sm:translate-y-[-50%] sm:rounded-[1.75rem] sm:shadow-[0_28px_70px_rgba(15,23,42,0.2)]">
					<div className="space-y-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:space-y-5 sm:px-6 sm:py-6">
						<div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
						<DialogHeader className="space-y-2 text-left">
							<DialogTitle className="text-lg font-semibold text-slate-900 sm:text-xl">Terms & Conditions</DialogTitle>
							<DialogDescription className="text-[13px] leading-relaxed text-slate-500 sm:text-sm">
								Please review and accept these terms before continuing to the password step.
							</DialogDescription>
						</DialogHeader>

						<div className="flex items-center justify-between rounded-[1.15rem] border border-slate-200 bg-white p-2 sm:rounded-2xl">
							<p className="px-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Language</p>
							<div className="inline-flex rounded-full bg-slate-100 p-1">
								<button
									type="button"
									onClick={() => setTermsLanguage("english")}
									className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${termsLanguage === "english" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
								>
									English
								</button>
								<button
									type="button"
									onClick={() => setTermsLanguage("hinglish")}
									className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${termsLanguage === "hinglish" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
								>
									Hinglish
								</button>
							</div>
						</div>

						<div className="max-h-[38vh] space-y-3 overflow-y-auto rounded-[1.15rem] bg-slate-50 p-3.5 text-[13px] leading-relaxed text-slate-600 sm:max-h-[42vh] sm:rounded-2xl sm:p-4 sm:text-sm">
							{termsLanguage === "english" ? (
								<>
									<p><span className="font-semibold text-slate-800">Primary Rule:</span> This app is for mockup, preview, and UI demonstration purposes only.</p>
									<p><span className="font-semibold text-slate-800">Responsible Usage:</span> Users should always purchase a valid, official ticket through an authorized railway booking channel.</p>
									<p><span className="font-semibold text-slate-800">No Ticket Replacement:</span> This app is not a substitute for a real ticket, reservation, or proof of travel.</p>
									<p><span className="font-semibold text-slate-800">User Responsibility:</span> All travel compliance, ticket validity, and identity verification remain the sole responsibility of the user.</p>
									<p><span className="font-semibold text-slate-800">No Liability:</span> The app creators are not responsible for misuse, misrepresentation, or travel-related penalties resulting from improper use.</p>
									<p><span className="font-semibold text-slate-800">Final Note:</span> Use this app only as a visual backup, prototype, or demonstration tool, and not as an official travel document.</p>
								</>
							) : (
								<>
									<p><span className="font-semibold text-slate-800">Primary Rule:</span> Yeh app sirf mockup, preview, aur UI demonstration purposes ke liye hai.</p>
									<p><span className="font-semibold text-slate-800">Responsible Usage:</span> Users ko hamesha authorized railway booking channel se valid official ticket lena chahiye.</p>
									<p><span className="font-semibold text-slate-800">No Ticket Replacement:</span> Yeh app real ticket, reservation, ya proof of travel ka replacement nahi hai.</p>
									<p><span className="font-semibold text-slate-800">User Responsibility:</span> Travel compliance, ticket validity, aur identity verification ki poori responsibility user ki rahegi.</p>
									<p><span className="font-semibold text-slate-800">No Liability:</span> Is app ke creators misuse, misrepresentation, ya improper use ki wajah se hone wale penalties ke liye responsible nahi honge.</p>
									<p><span className="font-semibold text-slate-800">Final Note:</span> Is app ko sirf visual backup, prototype, ya demonstration tool ki tarah use karein, official travel document ki tarah nahi.</p>
								</>
							)}
						</div>

						<div className="space-y-3 rounded-[1.15rem] border border-slate-200 bg-white p-3.5 sm:rounded-2xl sm:p-4">
							<div className="space-y-2 text-left">
								<Label htmlFor="signature" className="text-sm font-medium text-slate-700">Signature</Label>
								<Input
									id="signature"
									type="text"
									value={pendingPassenger?.name ?? ""}
									readOnly
									className="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3.5 text-sm shadow-none read-only:cursor-default"
								/>
							</div>

							<div className="flex items-start gap-3">
								<Checkbox
									id="termsAccepted"
									checked={termsAccepted}
									onCheckedChange={(checked) => setTermsAccepted(checked === true)}
									className="mt-0.5"
								/>
								<Label htmlFor="termsAccepted" className="text-[13px] leading-relaxed text-slate-600 sm:text-sm">
									I have read and understood the terms above, and I accept them before proceeding.
								</Label>
							</div>
						</div>

						<DialogFooter className="flex flex-col gap-3 sm:flex-col sm:space-x-0">
							<Button
								type="button"
								onClick={handleContinueFromTerms}
								disabled={!termsAccepted}
								className="h-12 w-full rounded-full !bg-[#31a24c] !text-white text-sm font-semibold shadow-[0_14px_30px_rgba(49,162,76,0.28)] hover:!bg-[#299043] disabled:opacity-50 active:scale-[0.99]"
							>
								Continue
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsTermsDialogOpen(false)}
								className="h-11 w-full rounded-full border-slate-200 text-sm font-medium text-slate-700"
							>
								Go Back
							</Button>
						</DialogFooter>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={isPasswordDialogOpen} onOpenChange={handlePasswordDialogChange}>
				<DialogContent className="left-1/2 top-auto bottom-0 w-[calc(100%-0.75rem)] max-w-sm translate-x-[-50%] translate-y-0 rounded-t-[1.75rem] rounded-b-none border-0 bg-white p-0 shadow-[0_-18px_45px_rgba(15,23,42,0.18)] sm:top-[50%] sm:bottom-auto sm:w-[calc(100%-1rem)] sm:max-w-sm sm:translate-y-[-50%] sm:rounded-[1.75rem] sm:shadow-[0_28px_70px_rgba(15,23,42,0.2)]">
					<div className="space-y-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:space-y-5 sm:px-6 sm:py-6">
						<div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
						<DialogHeader className="space-y-2 text-left">
							<DialogTitle className="text-lg font-semibold text-slate-900 sm:text-xl">Password Card</DialogTitle>
							<DialogDescription className="text-[13px] leading-relaxed text-slate-500 sm:text-sm">
								Enter the password manually. The format is first name + age, without spaces.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-2 text-left">
							<Label htmlFor="password" className="text-sm font-medium text-slate-700">Enter Password</Label>
							<Input
								id="password"
								type="text"
								placeholder="e.g., Rahul27"
								value={enteredPassword}
								onChange={(event) => {
									setEnteredPassword(event.target.value);
									if (passwordError) setPasswordError("");
								}}
								className="h-11 rounded-2xl border-slate-200 bg-slate-50 px-3.5 text-sm shadow-none"
							/>
							<p className="text-[11px] text-slate-500 sm:text-xs">Use the passenger's first name and age, without spaces.</p>
							{passwordError ? <p className="text-[11px] font-medium text-red-500 sm:text-xs">{passwordError}</p> : null}
						</div>

						<DialogFooter className="flex flex-col gap-3 sm:flex-col sm:space-x-0">
							<Button
								type="button"
								onClick={handleContinueToTicket}
								className="h-12 w-full rounded-full !bg-[#31a24c] !text-white text-sm font-semibold shadow-[0_14px_30px_rgba(49,162,76,0.28)] hover:!bg-[#299043] active:scale-[0.99]"
							>
								Continue
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsPasswordDialogOpen(false)}
								className="h-11 w-full rounded-full border-slate-200 text-sm font-medium text-slate-700"
							>
								Edit Details
							</Button>
						</DialogFooter>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default Index;
