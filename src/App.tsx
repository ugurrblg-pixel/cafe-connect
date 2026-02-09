import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { CheckInStatusBar } from "@/components/CheckInStatusBar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { PremiumProvider } from "@/contexts/PremiumContext";
import Discover from "./pages/Discover";
import CafeRoom from "./pages/CafeRoom";
import Messages from "./pages/Messages";
import ChatRoom from "./pages/ChatRoom";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Subscription from "./pages/Subscription";
import ProfileViewers from "./pages/ProfileViewers";
import Boost from "./pages/Boost";
import UserProfileView from "./pages/UserProfileView";
import NotFound from "./pages/NotFound";
import SafetyPrivacy from "./pages/settings/SafetyPrivacy";
import NotificationSettings from "./pages/settings/NotificationSettings";
import HelpSupport from "./pages/settings/HelpSupport";
import HowItWorks from "./pages/settings/HowItWorks";
import LocationUsage from "./pages/settings/LocationUsage";
import PremiumPayments from "./pages/settings/PremiumPayments";
import ContactUs from "./pages/settings/ContactUs";
import PrivacyPolicy from "./pages/settings/PrivacyPolicy";
import TermsOfUse from "./pages/settings/TermsOfUse";
import { AdminGuard } from "./components/admin/AdminGuard";
import { lazy, Suspense } from "react";

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminModeration = lazy(() => import("./pages/admin/AdminModeration"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue"));

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Allow browsing without complete profile - gating is handled per-action
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Hide status bar on certain pages
  const hideStatusBar = 
    location.pathname.startsWith('/cafe/') || 
    location.pathname.startsWith('/chat/') ||
    location.pathname.startsWith('/admin') ||
    location.pathname === '/auth';

  // Hide bottom nav on admin pages
  const hideBottomNav = location.pathname.startsWith('/admin');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Check-in Status Bar - shown when user is checked in */}
      {user && !hideStatusBar && <CheckInStatusBar />}
      
      <Routes>
        <Route 
          path="/onboarding" 
          element={user ? <Navigate to="/" replace /> : <Onboarding />} 
        />
        <Route 
          path="/auth" 
          element={user ? <Navigate to="/" replace /> : <Auth />} 
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Discover />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cafe/:id"
          element={
            <ProtectedRoute>
              <CafeRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:conversationId"
          element={
            <ProtectedRoute>
              <ChatRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <ProfileEdit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <ProtectedRoute>
                <UserProfileView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <Subscription />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/viewers"
            element={
              <ProtectedRoute>
                <ProfileViewers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/boost"
            element={
              <ProtectedRoute>
                <Boost />
              </ProtectedRoute>
            }
          />
          {/* Settings routes */}
          <Route path="/settings/safety" element={<ProtectedRoute><SafetyPrivacy /></ProtectedRoute>} />
          <Route path="/settings/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
          <Route path="/settings/help" element={<ProtectedRoute><HelpSupport /></ProtectedRoute>} />
          <Route path="/settings/help/how-it-works" element={<ProtectedRoute><HowItWorks /></ProtectedRoute>} />
          <Route path="/settings/help/location" element={<ProtectedRoute><LocationUsage /></ProtectedRoute>} />
          <Route path="/settings/help/premium" element={<ProtectedRoute><PremiumPayments /></ProtectedRoute>} />
          <Route path="/settings/help/contact" element={<ProtectedRoute><ContactUs /></ProtectedRoute>} />
          <Route path="/settings/help/privacy-policy" element={<ProtectedRoute><PrivacyPolicy /></ProtectedRoute>} />
          <Route path="/settings/help/terms" element={<ProtectedRoute><TermsOfUse /></ProtectedRoute>} />
          {/* Admin routes */}
          <Route path="/admin" element={<AdminGuard><Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdminDashboard /></Suspense></AdminGuard>} />
          <Route path="/admin/users" element={<AdminGuard><Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdminUsers /></Suspense></AdminGuard>} />
          <Route path="/admin/reports" element={<AdminGuard><Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdminReports /></Suspense></AdminGuard>} />
          <Route path="/admin/moderation" element={<AdminGuard><Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdminModeration /></Suspense></AdminGuard>} />
          <Route path="/admin/payments" element={<AdminGuard><Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdminPayments /></Suspense></AdminGuard>} />
          <Route path="/admin/subscriptions" element={<AdminGuard><Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdminSubscriptions /></Suspense></AdminGuard>} />
          <Route path="/admin/revenue" element={<AdminGuard><Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdminRevenue /></Suspense></AdminGuard>} />
          <Route path="/admin/audit-log" element={<AdminGuard><Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}><AdminAuditLog /></Suspense></AdminGuard>} />
          
          <Route path="*" element={<NotFound />} />
      </Routes>
      {user && !hideBottomNav && <BottomNav />}
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <I18nProvider>
          <LocationProvider>
            <AuthProvider>
              <PremiumProvider>
                <NotificationProvider>
                  <AppRoutes />
                </NotificationProvider>
              </PremiumProvider>
            </AuthProvider>
          </LocationProvider>
        </I18nProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
