'use client';

import { redirect, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';

const RATING_LOWER_MIN = -300;
const RATING_LOWER_MAX = 0;
const RATING_UPPER_MIN = 0;
const RATING_UPPER_MAX = 300;
const DEFAULT_RATING_LOWER = -200;
const DEFAULT_RATING_UPPER = 200;

export default function MatchmakingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<{ username: string; rating: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingLower, setRatingLower] = useState(DEFAULT_RATING_LOWER);
  const [ratingUpper, setRatingUpper] = useState(DEFAULT_RATING_UPPER);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        redirect('/auth/login');
      }

      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, rating')
        .eq('id', user.id)
        .single();

      setUserProfile(profile);
      setLoading(false);
    };

    getUser();
  }, [supabase]);

  const ws = useWebSocket(
    user && userProfile
      ? {
          userId: user.id,
          username: userProfile.username,
          rating: userProfile.rating,
          ratingLower,
          ratingUpper,
        }
      : { userId: '', username: '', rating: 1000, ratingLower: DEFAULT_RATING_LOWER, ratingUpper: DEFAULT_RATING_UPPER }
  );

  // When a match is found, both players are routed into the battle room.
  useEffect(() => {
    if (ws.matchFound && ws.battleRoomId) {
      router.push(`/room/${ws.battleRoomId}`);
    }
  }, [ws.matchFound, ws.battleRoomId, router]);

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

  const minMatchRating = userProfile.rating + ratingLower;
  const maxMatchRating = userProfile.rating + ratingUpper;
  const slidersDisabled = ws.inQueue || ws.matchFound;

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-background/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Find a Battle</CardTitle>
          <CardDescription>Challenge another player in real-time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${ws.connected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-sm text-muted-foreground">
              {ws.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Player Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{userProfile.username}</p>
              <p className="text-xs text-muted-foreground">Your rating</p>
            </div>
            <Badge variant="outline" className="text-base px-3 py-1">
              {userProfile.rating}
            </Badge>
          </div>

          {/* Error Display */}
          {ws.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{ws.error}</p>
            </div>
          )}

          {/* Rating Range Sliders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Matchmaking Range</label>
              <span className="text-xs text-muted-foreground font-mono">
                {minMatchRating} – {maxMatchRating}
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Lower bound</span>
                  <span className={ratingLower < 0 ? 'text-orange-500' : 'text-muted-foreground'}>
                    {ratingLower > 0 ? '+' : ''}{ratingLower}
                  </span>
                </div>
                <Slider
                  min={RATING_LOWER_MIN}
                  max={RATING_LOWER_MAX}
                  step={50}
                  value={[ratingLower]}
                  onValueChange={([val]) => setRatingLower(val)}
                  disabled={slidersDisabled}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground/60">
                  <span>{RATING_LOWER_MIN}</span>
                  <span>{RATING_LOWER_MAX}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Upper bound</span>
                  <span className={ratingUpper > 0 ? 'text-blue-500' : 'text-muted-foreground'}>
                    +{ratingUpper}
                  </span>
                </div>
                <Slider
                  min={RATING_UPPER_MIN}
                  max={RATING_UPPER_MAX}
                  step={50}
                  value={[ratingUpper]}
                  onValueChange={([val]) => setRatingUpper(val)}
                  disabled={slidersDisabled}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground/60">
                  <span>{RATING_UPPER_MIN}</span>
                  <span>{RATING_UPPER_MAX}</span>
                </div>
              </div>
            </div>

            {slidersDisabled && (
              <p className="text-xs text-muted-foreground italic">
                Leave queue to adjust range
              </p>
            )}
          </div>

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
                  Players in queue: {ws.queueSize} · Range: {minMatchRating}–{maxMatchRating}
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
          <div className="space-y-2 pt-2">
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
                <p>Rating: {userProfile.rating} ({ratingLower}/+{ratingUpper})</p>
                <p>User ID: {user.id.slice(0, 8)}...</p>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
