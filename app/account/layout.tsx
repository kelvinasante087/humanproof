import { AccountSidebar } from "@/components/account-sidebar";
import { AvatarProvider } from "@/components/avatar-context";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AvatarProvider>
      <div className="min-h-screen w-full bg-black flex flex-col lg:flex-row text-white">
        <AccountSidebar />
        <div className="flex-1 min-w-0 bg-black">
          {children}
        </div>
      </div>
    </AvatarProvider>
  );
}
