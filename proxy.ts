import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/forgot-password', '/reset-password'];
const AUTH_ROUTES = ['/login', '/register'];
const SUPER_ADMIN_EMAIL = 'mazenhelal29@gmail.com';

type ProxyUser = Pick<User, 'id' | 'email'>;

export async function proxy(request: NextRequest) {
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

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    PUBLIC_ROUTES.includes(pathname)
  ) {
    return supabaseResponse;
  }

  let user: ProxyUser | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    } else if (hasAuthSessionCookie(request)) {
      user = { id: 'offline-placeholder' };
    }
  } catch {
    if (hasAuthSessionCookie(request)) {
      user = { id: 'offline-placeholder' };
    }
  }

  if (user?.email === SUPER_ADMIN_EMAIL && !pathname.startsWith('/super-admin')) {
    return NextResponse.redirect(new URL('/super-admin', request.url));
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(
      new URL(user.email === SUPER_ADMIN_EMAIL ? '/super-admin' : '/dashboard', request.url)
    );
  }

  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/super-admin'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return supabaseResponse;
}

function hasAuthSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.includes('auth-token'));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
