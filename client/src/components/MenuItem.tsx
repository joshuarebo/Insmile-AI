import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface MenuItemProps {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
  badge?: number;
}

export default function MenuItem({
  href,
  icon,
  label,
  active = false,
  badge,
}: MenuItemProps) {
  return (
    <li>
      <Link href={href}>
        <a
          className={cn(
            "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium",
            active
              ? "bg-primary/10 text-primary"
              : "text-neutral-700 hover:bg-neutral-100"
          )}
        >
          <i className={cn(icon, active ? "text-primary" : "text-neutral-400")} />
          <span className="flex-1">{label}</span>
          {typeof badge === "number" && (
            <span
              className={cn(
                "inline-flex h-5 items-center justify-center rounded-full px-2 text-xs font-medium",
                active
                  ? "bg-primary/20 text-primary"
                  : "bg-neutral-100 text-neutral-600"
              )}
            >
              {badge}
            </span>
          )}
        </a>
      </Link>
    </li>
  );
} 