import Image from "next/image";

export function ProfileAvatar({
  displayName,
  photoVersion,
}: {
  displayName: string;
  photoVersion: number | null;
}) {
  return (
    <div
      className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-2 border-[var(--border)] bg-[var(--yellow)] text-3xl font-black text-[var(--on-color)] shadow-[0_5px_0_var(--shadow)] sm:h-28 sm:w-28"
      aria-hidden="true"
    >
      {photoVersion === null ? (
        <span>
          {Array.from(displayName.trim())
            .slice(0, 2)
            .join("")
            .toLocaleUpperCase()}
        </span>
      ) : (
        <Image
          src={`/api/profile/photo?v=${photoVersion}`}
          width={256}
          height={256}
          alt=""
          unoptimized
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
