import BookingForm from "../BookingForm";

export default function BookingAddPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add Booking</h2>
          <p className="text-gray-500">Create a new reservation</p>
        </div>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-200/50 p-4 md:p-6 lg:p-8 shadow-sm">
        <BookingForm />
      </div>
    </div>
  );
}


