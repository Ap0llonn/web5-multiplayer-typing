import { useTranslations } from "next-intl";
import { Icon } from "@/shared/presentation/ui/icon";
import { Select } from "@/shared/presentation/ui/select";

export function LobbyRoleField() {
  const t = useTranslations();
  return (
    <Select
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
