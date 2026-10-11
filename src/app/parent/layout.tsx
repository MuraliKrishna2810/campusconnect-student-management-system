import { Sidebar } from "@/components/Sidebar";
import { Protect } from "@/components/Protect";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protect roles={["PARENT"]}>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </Protect>
  );
}
