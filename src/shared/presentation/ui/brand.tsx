import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "../i18n/navigation";

export function Brand({ compact = false }: { compact?: boolean }) {
  const t = useTranslations();
  return (
    <Link
      href="/"
      aria-label={t("brandHome")}
      className={`brand-link ${compact ? "brand-link--compact" : ""}`}
    >
      <Image
        src="/brand/clak-logo.png"
        width={1983}
        height={793}
        sizes={compact ? "120px" : "(max-width: 640px) 140px, 180px"}
        alt={t("brandName")}
        className="h-auto w-full"
      />
    </Link>
  );
}
