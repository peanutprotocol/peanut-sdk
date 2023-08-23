export type LinkParams = {
    chainId: number;
    contractVersion: string | null;
    depositIdx: number;
    password: string | null;
    trackId: string;
}

type EventLogArgs = {
    args?: number[]
}

export type EventLog = {
    logs: EventLogArgs[]
}