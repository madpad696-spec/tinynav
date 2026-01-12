import { LogIn, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./Button";

export function Navbar({ authed }: { authed: boolean }) {
  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="glass flex items-center justify-between rounded-2xl px-4 py-3 shadow-[0_18px_44px_rgba(0,0,0,.10)]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-b from-white/30 to-white/10 dark:from-white/18 dark:to-white/8 border border-white/10" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">AppleBar</div>
              <div className="text-xs text-muted">个人导航</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {authed ? (
              <Link to="/admin">
                <Button variant="secondary" leftIcon={<Settings size={18} />}>
                  管理
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="ghost" leftIcon={<LogIn size={18} />}>
                  登录
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

