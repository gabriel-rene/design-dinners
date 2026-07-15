// Inline error banner shared by the CRUD forms. Cream-on-red so it reads as a
// brand-consistent alert, not a generic red toast.
export default function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-dd-red/30 bg-dd-red/10 px-3.5 py-2.5 text-sm font-medium text-dd-red"
    >
      {message}
    </p>
  );
}
