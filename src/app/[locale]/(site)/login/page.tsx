import { AuthPage } from "@/composition/auth/auth-page";
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return <AuthPage mode="login" searchParams={searchParams} />;
}
