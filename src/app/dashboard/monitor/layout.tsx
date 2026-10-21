export default function MonitorLayout({ children }: { children: React.ReactNode }) {
  return <div className="-m-6 h-[100dvh] overflow-hidden md:-m-8">{children}</div>;
}
