import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const protectedRoutes = ["/dashboard", "/battle", "/profile"];
const authRoutes = ["/login", "/signup"];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAuthRoute(pathname: string) {
  return authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function redirectTo(request: NextRequest, response: NextResponse, pathname: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";

  const redirectResponse = NextResponse.redirect(redirectUrl);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Refresh the auth session and get the user + Supabase client in one pass.
  // Previously a second client was created and getUser() was called again,
  // causing redundant auth round-trips.
  const { response, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (!user && isProtectedRoute(pathname)) {
    return redirectTo(request, response, "/login");
  }

  if (!user) {
    return response;
  }

  // Authenticated users must complete onboarding before accessing the app.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return response;
  }

  if (!profile && pathname !== "/onboarding") {
    return redirectTo(request, response, "/onboarding");
  }

  if (profile && isAuthRoute(pathname)) {
    return redirectTo(request, response, "/dashboard");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
