import { Icon } from "./icon";

export function ActionHeading({
  id,
  badge,
  title,
  description,
  icon,
  tone = "blue",
}: {
  id: string;
  badge: string;
  title: string;
  description: string;
  icon: "enter" | "plus";
  tone?: "blue" | "yellow";
}) {
  return (
    <div className="action-heading">
      <span className={`action-icon action-icon--${tone}`}>
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <p className="action-eyebrow">{badge}</p>
        <h2 id={id} className="card-title">
          {title}
        </h2>
        <p className="card-description">{description}</p>
      </div>
    </div>
  );
}
