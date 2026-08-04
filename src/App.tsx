import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { UIProvider } from "@/context/UIContext";
import { AppProvider } from "@/context/AppContext";
import { UserDataProvider } from "@/context/UserDataContext";
import { SocialProvider } from "@/context/SocialContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { RootLayout } from "@/components/layout/RootLayout";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { WelcomeScreen } from "@/components/auth/WelcomeScreen";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Lazy page imports — each becomes its own chunk
// ---------------------------------------------------------------------------

const LoginPage          = lazy(() => import("@/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const SignupPage         = lazy(() => import("@/pages/SignupPage").then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage  = lazy(() => import("@/pages/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const HomePage           = lazy(() => import("@/pages/HomePage").then(m => ({ default: m.HomePage })));
const AboutPage          = lazy(() => import("@/pages/AboutPage"));
const ContactPage        = lazy(() => import("@/pages/ContactPage"));
const NotFoundPage       = lazy(() => import("@/pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));
const SearchResultsPage  = lazy(() => import("@/pages/SearchResultsPage").then(m => ({ default: m.SearchResultsPage })));
const ShowProfilePage    = lazy(() => import("@/pages/ShowProfilePage").then(m => ({ default: m.ShowProfilePage })));
const UserProfilePage    = lazy(() => import("@/pages/UserProfilePage").then(m => ({ default: m.UserProfilePage })));
const BrowsePage         = lazy(() => import("@/pages/BrowsePage"));
const ListsPage          = lazy(() => import("@/pages/ListsPage"));
const ListDetailPage     = lazy(() => import("@/pages/ListDetailPage"));
const MembersPage        = lazy(() => import("@/pages/MembersPage"));
const LogPage            = lazy(() => import("@/pages/LogPage"));
const JournalPage        = lazy(() => import("@/pages/JournalPage"));
const PersonPage         = lazy(() => import("@/pages/PersonPage"));
const StatsPage          = lazy(() => import("@/pages/StatsPage"));
const SettingsPage       = lazy(() => import("@/pages/SettingsPage"));
const SchedulePage        = lazy(() => import("@/pages/SchedulePage").then(m => ({ default: m.SchedulePage })));

// ---------------------------------------------------------------------------
// Page-level suspense fallback
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 max-w-5xl mx-auto w-full pt-20">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

// ---------------------------------------------------------------------------
// Providers wrapper — shared by all routes
// ---------------------------------------------------------------------------

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UIProvider>
        <AppProvider>
          <UserDataProvider>
            <SocialProvider>
              <NotificationsProvider>{children}</NotificationsProvider>
            </SocialProvider>
          </UserDataProvider>
        </AppProvider>
      </UIProvider>
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// Router definition
// ---------------------------------------------------------------------------

const router = createBrowserRouter([
  {
    path: "/welcome",
    element: (
      <AppProviders>
        <WelcomeScreen onDone={() => {}} />
      </AppProviders>
    ),
  },

  {
    path: "/login",
    element: (
      <AppProviders>
        <S><LoginPage /></S>
      </AppProviders>
    ),
  },
  {
    path: "/signup",
    element: (
      <AppProviders>
        <S><SignupPage /></S>
      </AppProviders>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <AppProviders>
        <S><ForgotPasswordPage /></S>
      </AppProviders>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <AppProviders>
        <S><ResetPasswordPage /></S>
      </AppProviders>
    ),
  },

  {
    path: "/",
    element: (
      <AppProviders>
        <RequireAuth>
          <OnboardingFlow />
          <RootLayout />
        </RequireAuth>
      </AppProviders>
    ),
    children: [
      { index: true,                           element: <S><HomePage /></S> },
      { path: "shows",                         element: <S><BrowsePage /></S> },
      { path: "show/:showId",                  element: <S><ShowProfilePage /></S> },
      { path: "show/:showId/season/:seasonNumber", element: <S><ShowProfilePage /></S> },
      { path: "search",                        element: <S><SearchResultsPage /></S> },
      { path: "person/:personId",              element: <S><PersonPage /></S> },
      { path: "sign-in",                       element: <Navigate to="/login" replace /> },
      { path: "create-account",                element: <Navigate to="/signup" replace /> },
      // Named profile sub-routes MUST come before :username to avoid matching as username
      { path: "profile",                       element: <S><UserProfilePage /></S> },
      { path: "profile/watchlist",             element: <S><UserProfilePage tab="watchlist" /></S> },
      { path: "profile/likes",                 element: <S><UserProfilePage tab="likes" /></S> },
      { path: "profile/reviews",               element: <S><UserProfilePage tab="reviews" /></S> },
      { path: "profile/stats",                 element: <S><StatsPage /></S> },
      { path: "profile/:username",             element: <S><UserProfilePage /></S> },
      { path: "profile/:username/stats",       element: <S><StatsPage /></S> },
      { path: "settings",                      element: <S><SettingsPage /></S> },
      { path: "lists",                         element: <S><ListsPage /></S> },
      { path: "schedule",                      element: <S><SchedulePage /></S> },
      { path: "lists/:listId",                 element: <S><ListDetailPage /></S> },
      { path: "members",                       element: <S><MembersPage /></S> },
      { path: "log",                           element: <S><LogPage /></S> },
      { path: "journal",                       element: <S><JournalPage /></S> },
      { path: "about",                         element: <S><AboutPage /></S> },
      { path: "contact",                       element: <S><ContactPage /></S> },
      { path: "films",                         element: <Navigate to="/shows" replace /> },
      { path: "*",                             element: <S><NotFoundPage /></S> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
