import { pageTitle, pageSubtitle } from "./agentTheme";

export default function AgentPageHeader({ title, description, children }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className={pageTitle}>{title}</h2>
        {description && <p className={pageSubtitle}>{description}</p>}
      </div>
      {children && <div className="shrink-0 flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
