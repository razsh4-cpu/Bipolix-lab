import Link from "next/link";

// Big thumb-reach button for recording material use on a phone. Hidden from sm up,
// where the regular "הזנה מהירה" links are easy to hit.
export function QuickEntryFab() {
  return (
    <>
      <div className="h-20 sm:hidden" aria-hidden />
      <Link
        href="/inventory/quick"
        className="fixed inset-x-4 bottom-4 z-20 flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-900/25 hover:bg-blue-800 sm:hidden"
      >
        <span aria-hidden className="text-2xl leading-none">±</span>
        הזנה מהירה למלאי
      </Link>
    </>
  );
}
