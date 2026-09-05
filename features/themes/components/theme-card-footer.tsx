export function ThemeCardFooter({ detail, title }: { detail: string; title: string }) {
  return (
    <footer className="pointer-events-none flex items-baseline justify-between gap-4 px-[0.9rem] pt-[0.8rem] pb-[0.9rem]">
      <h3 className="text-title-sm/ui text-foreground m-0 font-medium">{title}</h3>
      <p className="text-micro/ui text-muted-foreground m-0 text-right">{detail}</p>
    </footer>
  );
}
