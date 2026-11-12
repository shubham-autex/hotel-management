export const DEPARTMENTS = ["Cleaning", "Management", "Electicity"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const ID_PROOF_TYPES = ["Aadhar", "PAN", "Rasgan Card", "Voter Id"] as const;
export type IdProofType = (typeof ID_PROOF_TYPES)[number];
