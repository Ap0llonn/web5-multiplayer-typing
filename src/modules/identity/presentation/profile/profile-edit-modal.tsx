"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Profile } from "../../contracts/profile";
import { Button } from "@/shared/presentation/ui/button";
import { Modal } from "@/shared/presentation/ui/modal";
import { ProfileForm } from "./profile-form";

export function ProfileEditModal({ profile }: { profile: Profile }) {
  const t = useTranslations("profile");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="paper" onClick={() => setOpen(true)}>
        {t("editButton")}
      </Button>
      <Modal
        open={open}
        title={t("editTitle")}
        description={t("editDescription")}
        onClose={() => setOpen(false)}
      >
        <ProfileForm
          profile={profile}
          actions={
            <Button variant="paper" onClick={() => setOpen(false)}>
              {t("closeEditor")}
            </Button>
          }
        />
      </Modal>
    </>
  );
}
