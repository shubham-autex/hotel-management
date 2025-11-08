import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Booking } from "@/models/Booking";
import EditBookingForm from "./EditBookingForm";

export default async function BookingEditPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyAuthToken(token) : null;
  if (!payload) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
        Please log in to edit bookings.
      </div>
    );
  }

  await connectToDatabase();
  const { id } = await params;
  const booking = await Booking.findById(id).lean();
  if (!booking) {
    return <div className="p-4">Booking not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Edit Booking</h2>
        <p className="text-gray-500">Update booking details, services, and pricing</p>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-4 md:p-8 shadow-sm">
        <EditBookingForm booking={JSON.parse(JSON.stringify(booking))} />
      </div>
    </div>
  );
}

