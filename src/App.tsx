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
import { HomePage } from "@/pages/HomePage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { SearchResultsPage } from "@/pages/SearchResultsPage";
import { ShowProfilePage } from "@/pages/ShowProfilePage";
import { UserProfilePage } from "@/pages/UserProfilePage";
import BrowsePage from "@/pages/BrowsePage";
import ListsPage from "@/pages/ListsPage";
import ListDetailPage from "@/pages/ListDetailPage";
import MembersPage from "@/pages/MembersPage";
import LogPage from "@/pages/LogPage";
import JournalPage from "@/pages/JournalPage";
import PersonPage from "@/pages/PersonPage";
import StatsPage from "@/pages/StatsPage";
import SettingsPage from "@/pages/SettingsPage";

// ---------------------------------------------------------------------------
// Router definition
// ---------------------------------------------------------------------------

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthProvider>
        <UIProvider>
          <AppProvider>
            <UserDataProvider>
              <SocialProvider>
                <NotificationsProvider>
                  <OnboardingFlow />
                  <RootLayout />
                </NotificationsProvider>
              </SocialProvider>
            </UserDataProvider>
          </AppProvider>
        </UIProvider>
      </AuthProvider>
    ),
    children: [
      { index: true, element: <HomePage /> },

      // Discovery / browse
      { path: "shows", element: <BrowsePage /> },

      // Individual show
      { path: "show/:showId", element: <ShowProfilePage /> },
      { path: "show/:showId/season/:seasonNumber", element: <ShowProfilePage /> },

      // Search results
      { path: "search", element: <SearchResultsPage /> },

      // Person (cast/crew)
      { path: "person/:personId", element: <PersonPage /> },

      // User flow (auth handled by modal, but keep routes for deep links)
      { path: "sign-in", element: <Navigate to="/" replace /> },
      { path: "create-account", element: <Navigate to="/" replace /> },
      { path: "profile", element: <UserProfilePage /> },
      { path: "profile/:username", element: <UserProfilePage /> },

      // Stats dashboard
      { path: "profile/stats", element: <StatsPage /> },
      { path: "profile/:username/stats", element: <StatsPage /> },

      // Settings
      { path: "settings", element: <SettingsPage /> },

      // Lists
      { path: "lists", element: <ListsPage /> },
      { path: "lists/:listId", element: <ListDetailPage /> },

      // Members directory
      { path: "members", element: <MembersPage /> },

      // Logging / diary
      { path: "log", element: <LogPage /> },

      // Journal / activity feed
      { path: "journal", element: <JournalPage /> },

      // Static
      { path: "about", element: <AboutPage /> },
      { path: "contact", element: <ContactPage /> },

      // Legacy redirect
      { path: "films", element: <Navigate to="/shows" replace /> },

      // 404
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
