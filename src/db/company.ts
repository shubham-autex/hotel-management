import { desc, eq } from "drizzle-orm";
import { toDoc } from "@/db/helpers";
import { db } from "@/lib/db";
import { companyProfiles } from "@/db/schema";

export async function getCompanyProfile() {
  const database = await db();
  const [row] = await database.select().from(companyProfiles).orderBy(desc(companyProfiles.createdAt)).limit(1);
  return row ? toDoc(row) : null;
}

export async function upsertCompanyProfile(input: {
  name: string;
  address: string;
  contactPersonName: string;
  contactPhone: string;
  logo?: string | null;
  gstin?: string | null;
}) {
  const database = await db();
  const existing = await getCompanyProfile();
  if (!existing) {
    const [row] = await database
      .insert(companyProfiles)
      .values({
        name: input.name,
        address: input.address,
        contactPersonName: input.contactPersonName,
        contactPhone: input.contactPhone,
        logo: input.logo ?? null,
        gstin: input.gstin ?? null,
      })
      .returning();
    return toDoc(row);
  }
  const [row] = await database
    .update(companyProfiles)
    .set({
      name: input.name,
      address: input.address,
      contactPersonName: input.contactPersonName,
      contactPhone: input.contactPhone,
      logo: input.logo ?? null,
      gstin: input.gstin ?? null,
      updatedAt: new Date(),
    })
    .where(eq(companyProfiles.id, existing._id))
    .returning();
  return toDoc(row);
}
