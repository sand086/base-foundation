import { sidebarIcons, type SidebarIconKey } from "@/assets/img/icons/sidebar";

type Props = {
  name: SidebarIconKey;
  className?: string;
  alt?: string;
};

export function SidebarSvgIcon({ name, className = "h-4 w-4", alt }: Props) {
  const src = sidebarIcons[name];

  return (
    <img
      src={src}
      alt={alt ?? name}
      className={`${className} brightness-0 invert`}
      loading="lazy"
      draggable={false}
    />
  );
}
