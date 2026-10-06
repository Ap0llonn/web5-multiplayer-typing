import { useTranslations } from "next-intl";
import { Link } from "@/shared/presentation/i18n/navigation";
import { ActionHeading } from "@/shared/presentation/ui/action-heading";
import { buttonStyles } from "@/shared/presentation/ui/button";
import { Card } from "@/shared/presentation/ui/card";
import { Icon } from "@/shared/presentation/ui/icon";

export function HomeEntryCards() {
  const t = useTranslations();

  return (
    <div className="action-grid">
      <Card aria-labelledby="join-room-title" className="lobby-join-card">
        <ActionHeading
          id="join-room-title"
          badge={t("joinBadge")}
          title={t("join")}
          description={t("joinDescription")}
          icon="enter"
        />
        <Link href="/play" className={buttonStyles({ variant: "pink" })}>
          {t("join")}
          <Icon name="arrow" />
        </Link>
        <p className="card-footnote">
          <Icon name="check" />
          {t("noAccountNeeded")}
        </p>
      </Card>
      <Card
        tone="yellow"
        aria-labelledby="create-room-title"
        className="lobby-create-card flex flex-col"
      >
        <ActionHeading
          id="create-room-title"
          badge={t("hostBadge")}
          title={t("create")}
          description={t("createDescription")}
          icon="plus"
          tone="yellow"
        />
        <div className="host-perks">
          <span>
            <Icon name="check" />
            {t("hostPerkCode")}
          </span>
          <span>
            <Icon name="check" />
            {t("hostPerkRole")}
          </span>
        </div>
        <div className="mt-auto grid gap-3 pt-5">
          <Link
            href="/play/create"
            className={buttonStyles({ variant: "ink" })}
          >
            {t("create")}
            <Icon name="arrow" />
          </Link>
          <p className="card-footnote">{t("accountRequired")}</p>
        </div>
      </Card>
    </div>
  );
}
