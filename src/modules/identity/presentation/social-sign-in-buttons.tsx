import { useTranslations } from "next-intl";
import { Button } from "@/shared/presentation/ui/button";

export type SocialProvider = "github" | "discord";

export function SocialSignInButtons({
  providers,
  pending,
  onSignIn,
}: {
  providers: readonly string[];
  pending: boolean;
  onSignIn: (provider: SocialProvider) => Promise<void>;
}) {
  const t = useTranslations();

  return (
    <div className="grid gap-4">
      <div className="auth-divider">
        <span>{t("or")}</span>
      </div>
      {(["github", "discord"] as const).map((provider) => (
        <div key={provider}>
          <Button
            variant="paper"
            className="w-full"
            disabled={!providers.includes(provider) || pending}
            onClick={() => onSignIn(provider)}
          >
            {t(provider)}
          </Button>
          {!providers.includes(provider) && (
            <small className="mt-2 block text-center">
              {t("providerUnavailable")}
            </small>
          )}
        </div>
      ))}
    </div>
  );
}
