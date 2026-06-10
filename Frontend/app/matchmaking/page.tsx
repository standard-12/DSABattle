'use client';

import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function MatchmakingPage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<{ username: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        redirect('/auth/login');
      }

      setUser(user);

      // Fetch user profile for username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      setUserProfile(profile);
      setLoading(false);
    };

    getUser();
  }, [supabase]);

  // WebSocket hook (only mounted after we have user data)
  const ws = useWebSocket(
    user && userProfile
      ? {
          userId: user.id,
          username: userProfile.username,
        }
      : { userId: '', username: '' }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Unable to load user data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-background/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Find a Battle</CardTitle>
          <CardDescription>Challenge another player in real-time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Connection Status</label>
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  ws.connected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {ws.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Player</label>
            <p className="text-sm text-muted-foreground">{userProfile.username}</p>
          </div>

          {/* Error Display */}
          {ws.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{ws.error}</p>
            </div>
          )}

          {/* Queue Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Queue Status</label>
            {ws.inQueue ? (
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Waiting for opponent...</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Players in queue: {ws.queueSize}
                </p>
              </div>
            ) : ws.matchFound ? (
              <div className="text-center space-y-3">
                <Badge className="bg-green-600">Match Found!</Badge>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Opponent: {ws.opponent?.username}</p>
                  <p className="text-xs text-muted-foreground">
                    Battle Room: {ws.battleRoomId}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not in queue</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            {!ws.inQueue && !ws.matchFound && (
              <Button
                onClick={ws.joinQueue}
                disabled={!ws.connected}
                className="w-full"
                size="lg"
              >
                {ws.connected ? 'Join Queue' : 'Connecting...'}
              </Button>
            )}

            {ws.inQueue && !ws.matchFound && (
              <Button onClick={ws.leaveQueue} variant="outline" className="w-full" size="lg">
                Cancel
              </Button>
            )}

            {ws.matchFound && (
              <div className="space-y-2">
                <Button className="w-full" size="lg" disabled>
                  Starting Battle...
                </Button>
                <Button onClick={ws.leaveQueue} variant="outline" className="w-full" size="sm">
                  Decline Match
                </Button>
              </div>
            )}
          </div>

          {/* Debug Info */}
          <div className="pt-4 border-t">
            <details className="text-xs text-muted-foreground space-y-1">
              <summary className="cursor-pointer font-medium">Debug Info</summary>
              <div className="mt-2 space-y-1 font-mono">
                <p>Connected: {ws.connected.toString()}</p>
                <p>In Queue: {ws.inQueue.toString()}</p>
                <p>Match Found: {ws.matchFound.toString()}</p>
                <p>User ID: {user.id.slice(0, 8)}...</p>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
