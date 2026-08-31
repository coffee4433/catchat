// app/tools/page.tsx
import CommandCenter from "../../components/command-center";

export default function ToolsPage() {
  return (
    // pt-9 clears the fixed app window frame.
    <div className="h-screen w-screen overflow-hidden pt-9">
      <CommandCenter />
    </div>
  );
}
