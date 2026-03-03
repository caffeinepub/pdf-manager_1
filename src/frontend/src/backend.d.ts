import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface PdfEntry {
    id: string;
    blob: ExternalBlob;
    fileSize: bigint;
    uploadTimestamp: bigint;
    filename: string;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deletePdf(id: string): Promise<void>;
    getAllPdfs(): Promise<Array<PdfEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLatestPdfs(limit: bigint): Promise<Array<PdfEntry>>;
    getPdf(id: string): Promise<PdfEntry>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchPdfs(searchTerm: string): Promise<Array<PdfEntry>>;
    uploadPdf(id: string, filename: string, fileSize: bigint, blob: ExternalBlob): Promise<void>;
}
