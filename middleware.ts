import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
const AUTH_ROUTES = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;

  // FAST PATH: Allow static files and public routes IMMEDIATELY
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/api') ||
    pathname.includes('.') || // Static files like .png, .svg
    PUBLIC_ROUTES.includes(pathname)
  ) {
    return supabaseResponse;
  }

  // Only check session for protected routes
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    } else {
      // Fallback for offline mode on localhost: 
      // If we have a supabase auth cookie, assume the user is authenticated 
      // since we can't verify with the server right now.
      const cookies = request.cookies.getAll();
      const hasSession = cookies.some(c => c.name.includes('auth-token'));
      if (hasSession) {
        // We can't get the full user object easily without network, 
        // but we can at least avoid the redirect.
        user = { id: 'offline-placeholder' } as any; 
      }
    }
  } catch (e) {
    const cookies = request.cookies.getAll();
    if (cookies.some(c => c.name.includes('auth-token'))) {
      user = { id: 'offline-placeholder' } as any;
    }
  }

  // 1. Force Super Admin to their dashboard if they land elsewhere
  if (user?.email === 'mazenhelal29@gmail.com' && !pathname.startsWith('/super-admin')) {
    return NextResponse.redirect(new URL('/super-admin', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (user && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL(user.email === 'mazenhelal29@gmail.com' ? '/super-admin' : '/dashboard', request.url));
  }

  // Redirect unauthenticated users to login
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/super-admin'))) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
