import { useTranslations } from "next-intl";
import { Card } from "@/shared/presentation/ui/card";
import { ActionHeading } from "@/shared/presentation/ui/action-heading";
import { Button } from "@/shared/presentation/ui/button";
import { Field, Input } from "@/shared/presentation/ui/field";
import { Icon } from "@/shared/presentation/ui/icon";
import { LobbyRoleField } from "./lobby-role-field";

type RoomFormProps = { pending: boolean; onSubmit: (data: FormData) => void };

export function JoinRoomCard({ pending, onSubmit }: RoomFormProps) {
  const t = useTranslations();
  return (
    <Card className="lobby-join-card" aria-labelledby="join-room-title">
      <form
        className="grid h-full content-start gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <ActionHeading
          id="join-room-title"
          badge={t("joinBadge")}
          title={t("join")}
          description={t("joinDescription")}
          icon="enter"
        />
        <Field label={t("code")}>
          <Input
            className="font-mono uppercase tracking-widest"
            placeholder={t("codePlaceholder")}
            name="code"
            minLength={6}
            maxLength={6}
            autoComplete="off"
            autoCapitalize="characters"
            required
          />
        </Field>
        <LobbyRoleField />
        <Button
          type="submit"
          variant="pink"
          disabled={pending}
          className="w-full"
        >
          {pending ? t("pending") : t("join")}
          <Icon name="arrow" />
        </Button>
      </form>
    </Card>
  );
}

export function CreateRoomCard({ pending, onSubmit }: RoomFormProps) {
  const t = useTranslations();
  return (
    <Card
      tone="yellow"
      className="lobby-create-card"
      aria-labelledby="create-room-title"
    >
      <form
        className="grid h-full content-start gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(new FormData(event.currentTarget));
        }}
      >
        <ActionHeading
          id="create-room-title"
          badge={t("hostBadge")}
          title={t("create")}
          description={t("createDescription")}
          icon="plus"
          tone="yellow"
        />
        <Field label={t("roomName")}>
          <Input
            name="name"
            required
            maxLength={60}
            placeholder={t("roomPlaceholder")}
          />
        </Field>
        <div className="room-settings">
          <Field label={t("capacity")}>
            <Input
              name="capacity"
              type="number"
              min={2}
              max={30}
              defaultValue={8}
              required
            />
          </Field>
          <LobbyRoleField />
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t("pending") : t("create")}
          <Icon name="arrow" />
        </Button>
      </form>
    </Card>
  );
}

export function GuestCreateCard() {
  const t = useTranslations();
  return (
    <Card
      tone="yellow"
      className="lobby-create-card"
      aria-labelledby="create-room-title"
    >
      <ActionHeading
        id="create-room-title"
        badge={t("hostBadge")}
        title={t("create")}
        description={t("guestLimit")}
        icon="plus"
        tone="yellow"
      />
    </Card>
  );
}
