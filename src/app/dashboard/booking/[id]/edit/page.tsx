import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Booking } from "@/models/Booking";
import EditBookingForm from "./EditBookingForm";
import BookingEditClient from "./BookingEditClient";

export default async function BookingEditPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
        <BookingEditClient textKey="pleaseLogin" />
      </div>
    );
  }

  await connectToDatabase();
  const { id } = await params;
  const booking = await Booking.findById(id).lean();
  if (!booking) {
    return (
      <div className="p-4">
        <BookingEditClient textKey="bookingNotFound" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <BookingEditClient textKey="editTitle" descriptionKey="updateBookingDetails" />
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-4 md:p-8 shadow-sm">
        <EditBookingForm booking={JSON.parse(JSON.stringify(booking))} />
      </div>
    </div>
  );
}

