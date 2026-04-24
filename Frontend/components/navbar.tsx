import Link from 'next/link';

interface NavbarProps {
  profile: {
    username: string;
  };
}

export function Navbar({ profile }: NavbarProps) {
  const avatarInitial = profile.username.charAt(0).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo / App Name */}
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-primary">DSA Battle</h1>

          {/* Navigation Links */}
          <div className="hidden md:flex gap-6">
            <Link
              href="/dashboard"
              className="text-foreground/80 hover:text-foreground transition-colors text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/leaderboard"
              className="text-foreground/80 hover:text-foreground transition-colors text-sm font-medium"
            >
              Leaderboard
            </Link>
          </div>
        </div>

        {/* Right Section - Avatar */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{avatarInitial}</span>
          </div>
          <span className="hidden sm:inline text-sm text-foreground/70">{profile.username}</span>
        </div>
      </div>
    </nav>
  );
}
