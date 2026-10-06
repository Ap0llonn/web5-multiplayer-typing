import type { ReactNode } from "react";
import { Badge } from "./badge";
import { Card } from "./card";
import { DecorativeImage } from "./decorative-image";

export function AuthLayout({
  title,
  description,
  badge,
  children,
  footer,
}: {
  title: string;
  description: string;
  badge: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-intro">
        <Badge tone="blue">{badge}</Badge>
        <h1 className="auth-title">{title}</h1>
        <p className="text-muted">{description}</p>
        <DecorativeImage kind="friends" eager className="auth-illustration" />
      </div>
      <div className="auth-form-panel">
        <Card>{children}</Card>
        <div className="mt-8 text-center text-sm font-semibold">{footer}</div>
      </div>
    </div>
  );
}
