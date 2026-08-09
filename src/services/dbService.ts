import type { PassengerDetails } from "@/components/BookingDetails";

export interface TicketRecord {
	passenger: PassengerDetails;
	ticketCode: string;
	bookedOnTimestamp: number;
	editableText?: Record<string, string>;
	positions?: Record<string, { x: number; y: number }>;
}

const DB_NAME = "RailwayTicketDB";
const DB_VERSION = 1;
const STORE_NAME = "app_store";

const DRAFT_PASSENGER_STORAGE_KEY = "local-ticket-draft-passenger";
const TICKET_RECORD_STORAGE_KEY = "local-ticket-record";
const ONBOARDING_STORAGE_KEY = "local-ticket-onboarding-seen";
const DRAFT_PASSENGER_COOKIE_KEY = "local_ticket_draft_passenger";
const TICKET_RECORD_COOKIE_KEY = "local_ticket_record";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10;

const isPassengerDetails = (value: unknown): value is PassengerDetails => {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.name === "string" &&
		typeof candidate.age === "string" &&
		typeof candidate.idType === "string" &&
		typeof candidate.idNumber === "string" &&
		typeof candidate.source === "string" &&
		typeof candidate.destination === "string" &&
		typeof candidate.distance === "string"
	);
};

const isTicketRecord = (value: unknown): value is TicketRecord => {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Record<string, unknown>;
	return isPassengerDetails(candidate.passenger) && typeof candidate.ticketCode === "string" && typeof candidate.bookedOnTimestamp === "number";
};

class IndexedDBStorage {
	private dbPromise: Promise<IDBDatabase> | null = null;

	private getDB(): Promise<IDBDatabase> {
		if (this.dbPromise) return this.dbPromise;

		this.dbPromise = new Promise((resolve, reject) => {
			if (typeof window === "undefined" || !window.indexedDB) {
				reject(new Error("IndexedDB not available"));
				return;
			}

			const request = window.indexedDB.open(DB_NAME, DB_VERSION);

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME);
				}
			};

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		return this.dbPromise;
	}

	async getItem<T>(key: string): Promise<T | null> {
		try {
			const db = await this.getDB();
			return new Promise((resolve) => {
				const tx = db.transaction(STORE_NAME, "readonly");
				const store = tx.objectStore(STORE_NAME);
				const req = store.get(key);
				req.onsuccess = () => resolve((req.result as T) ?? null);
				req.onerror = () => resolve(null);
			});
		} catch {
			return null;
		}
	}

	async setItem<T>(key: string, value: T): Promise<void> {
		try {
			const db = await this.getDB();
			return new Promise((resolve) => {
				const tx = db.transaction(STORE_NAME, "readwrite");
				const store = tx.objectStore(STORE_NAME);
				const req = store.put(value, key);
				req.onsuccess = () => resolve();
				req.onerror = () => resolve();
			});
		} catch {
			// Ignore error
		}
	}

	async removeItem(key: string): Promise<void> {
		try {
			const db = await this.getDB();
			return new Promise((resolve) => {
				const tx = db.transaction(STORE_NAME, "readwrite");
				const store = tx.objectStore(STORE_NAME);
				const req = store.delete(key);
				req.onsuccess = () => resolve();
				req.onerror = () => resolve();
			});
		} catch {
			// Ignore error
		}
	}
}

const idb = new IndexedDBStorage();

const readCookieValue = (cookieKey: string): string | null => {
	if (typeof document === "undefined") return null;
	const encodedKey = `${encodeURIComponent(cookieKey)}=`;
	const matched = document.cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(encodedKey));
	if (!matched) return null;
	return matched.slice(encodedKey.length);
};

const writeCookieJSON = (cookieKey: string, value: unknown) => {
	if (typeof document === "undefined") return;
	const serializedValue = encodeURIComponent(JSON.stringify(value));
	document.cookie = `${encodeURIComponent(cookieKey)}=${serializedValue}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
};

const removeCookie = (cookieKey: string) => {
	if (typeof document === "undefined") return;
	document.cookie = `${encodeURIComponent(cookieKey)}=; path=/; max-age=0; samesite=lax`;
};

const readLocalStorageJSON = <T>(key: string, validator: (v: unknown) => v is T): T | null => {
	if (typeof window === "undefined") return null;
	try {
		const rawValue = window.localStorage.getItem(key);
		if (!rawValue) return null;
		const parsedValue: unknown = JSON.parse(rawValue);
		return validator(parsedValue) ? parsedValue : null;
	} catch {
		return null;
	}
};

const readCookieJSON = <T>(key: string, validator: (v: unknown) => v is T): T | null => {
	const val = readCookieValue(key);
	if (!val) return null;
	try {
		const parsed: unknown = JSON.parse(decodeURIComponent(val));
		return validator(parsed) ? parsed : null;
	} catch {
		return null;
	}
};

const writeLocalStorageJSON = (key: string, value: unknown) => {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Ignore quota
	}
};

const removeLocalStorage = (key: string) => {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(key);
	} catch {
		// Ignore
	}
};

export const dbService = {
	getTicketRecordSync(): TicketRecord | null {
		return (
			readLocalStorageJSON(TICKET_RECORD_STORAGE_KEY, isTicketRecord) ??
			readCookieJSON(TICKET_RECORD_COOKIE_KEY, isTicketRecord)
		);
	},

	getDraftPassengerSync(fallback: PassengerDetails): PassengerDetails {
		return (
			readLocalStorageJSON(DRAFT_PASSENGER_STORAGE_KEY, isPassengerDetails) ??
			readCookieJSON(DRAFT_PASSENGER_COOKIE_KEY, isPassengerDetails) ??
			fallback
		);
	},

	getHasSeenOnboardingSync(): boolean {
		return (
			readLocalStorageJSON(ONBOARDING_STORAGE_KEY, (v): v is boolean => typeof v === "boolean") ?? false
		);
	},

	async setHasSeenOnboarding(seen: boolean): Promise<void> {
		writeLocalStorageJSON(ONBOARDING_STORAGE_KEY, seen);
		await idb.setItem(ONBOARDING_STORAGE_KEY, seen);
	},

	async saveTicketRecord(record: TicketRecord): Promise<void> {
		writeLocalStorageJSON(TICKET_RECORD_STORAGE_KEY, record);
		writeCookieJSON(TICKET_RECORD_COOKIE_KEY, record);
		await idb.setItem(TICKET_RECORD_STORAGE_KEY, record);
	},

	async updateTicketState(editableText?: Record<string, string>, positions?: Record<string, { x: number; y: number }>): Promise<void> {
		const current = this.getTicketRecordSync();
		if (!current) return;
		const updated: TicketRecord = {
			...current,
			editableText: editableText ?? current.editableText,
			positions: positions ?? current.positions,
		};
		await this.saveTicketRecord(updated);
	},

	async clearTicketRecord(): Promise<void> {
		removeLocalStorage(TICKET_RECORD_STORAGE_KEY);
		removeCookie(TICKET_RECORD_COOKIE_KEY);
		await idb.removeItem(TICKET_RECORD_STORAGE_KEY);
	},

	async saveDraftPassenger(passenger: PassengerDetails): Promise<void> {
		writeLocalStorageJSON(DRAFT_PASSENGER_STORAGE_KEY, passenger);
		writeCookieJSON(DRAFT_PASSENGER_COOKIE_KEY, passenger);
		await idb.setItem(DRAFT_PASSENGER_STORAGE_KEY, passenger);
	},

	async getTicketRecordAsync(): Promise<TicketRecord | null> {
		const fromIdb = await idb.getItem<TicketRecord>(TICKET_RECORD_STORAGE_KEY);
		if (fromIdb && isTicketRecord(fromIdb)) {
			writeLocalStorageJSON(TICKET_RECORD_STORAGE_KEY, fromIdb);
			return fromIdb;
		}
		return this.getTicketRecordSync();
	},
};
