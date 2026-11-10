import { useTranslations } from "next-intl";
import { Icon } from "@/shared/presentation/ui/icon";
import { Dropdown } from "@/shared/presentation/ui/dropdown";

export function LobbyRoleField() {
  const t = useTranslations();
  return (
    <Dropdown
      name="role"
      label={t("role")}
      defaultValue="PARTICIPANT"
      options={[
        {
          value: "PARTICIPANT",
          label: t("PARTICIPANT"),
          icon: <Icon name="people" />,
        },
        {
          value: "SPECTATOR",
          label: t("SPECTATOR"),
          icon: <Icon name="eye" />,
        },
      ]}
    />
  );
}
