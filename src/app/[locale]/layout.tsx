import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/shared/presentation/i18n/routing";
import { Theme } from "@/shared/presentation/theme/provider";
import { SiteLayout } from "@/composition/site/site-layout";
import "@/shared/presentation/styles/tokens.css";
export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t("title"), description: t("roomIntro") };
}
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={await getMessages()}>
          <Theme>
            <SiteLayout>{children}</SiteLayout>
          </Theme>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
