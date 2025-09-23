export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Services</h1>
      {children}
    </div>
  );
}


