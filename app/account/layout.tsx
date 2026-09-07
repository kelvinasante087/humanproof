import { AccountSidebar } from "@/components/account-sidebar";
import { AvatarProvider } from "@/components/avatar-context";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AvatarProvider>
      <div className="min-h-screen w-full bg-black text-white lg:h-screen lg:overflow-hidden">
        <AccountSidebar />
        <div className="min-w-0 bg-black lg:ml-64 lg:h-screen lg:overflow-y-auto xl:ml-72">
          {children}
        </div>
      </div>
    </AvatarProvider>
  );
}
