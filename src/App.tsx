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
import { lazy, Suspense, memo } from "react";
import { AdminGuard } from "./components/admin/AdminGuard";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy-load all page components for faster initial load
const Discover = lazy(() => import("./pages/Discover"));
const CafeRoom = lazy(() => import("./pages/CafeRoom"));
const Messages = lazy(() => import("./pages/Messages"));
const ChatRoom = lazy(() => import("./pages/ChatRoom"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const Search = lazy(() => import("./pages/Search"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Subscription = lazy(() => import("./pages/Subscription"));
const ProfileViewers = lazy(() => import("./pages/ProfileViewers"));
const Boost = lazy(() => import("./pages/Boost"));
const UserProfileView = lazy(() => import("./pages/UserProfileView"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SafetyPrivacy = lazy(() => import("./pages/settings/SafetyPrivacy"));
const NotificationSettings = lazy(() => import("./pages/settings/NotificationSettings"));
const HelpSupport = lazy(() => import("./pages/settings/HelpSupport"));
const HowItWorks = lazy(() => import("./pages/settings/HowItWorks"));
const LocationUsage = lazy(() => import("./pages/settings/LocationUsage"));
const PremiumPayments = lazy(() => import("./pages/settings/PremiumPayments"));
const ContactUs = lazy(() => import("./pages/settings/ContactUs"));
const PrivacyPolicy = lazy(() => import("./pages/settings/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/settings/TermsOfUse"));

const PageFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const SuspensePage = memo(({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageFallback />}>{children}</Suspense>
));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminModeration = lazy(() => import("./pages/admin/AdminModeration"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
// AdminPayments removed — Stripe not used
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue"));
const AdminVerification = lazy(() => import("./pages/admin/AdminVerification"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

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
          element={user ? <Navigate to="/" replace /> : <SuspensePage><Onboarding /></SuspensePage>} 
        />
        <Route 
          path="/auth" 
          element={user ? <Navigate to="/" replace /> : <SuspensePage><Auth /></SuspensePage>} 
        />
        <Route path="/" element={<ProtectedRoute><SuspensePage><Discover /></SuspensePage></ProtectedRoute>} />
        <Route path="/cafe/:id" element={<ProtectedRoute><SuspensePage><CafeRoom /></SuspensePage></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><SuspensePage><Notifications /></SuspensePage></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><SuspensePage><Search /></SuspensePage></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><SuspensePage><Messages /></SuspensePage></ProtectedRoute>} />
        <Route path="/chat/:conversationId" element={<ProtectedRoute><SuspensePage><ChatRoom /></SuspensePage></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><SuspensePage><Profile /></SuspensePage></ProtectedRoute>} />
        <Route path="/profile/edit" element={<ProtectedRoute><SuspensePage><ProfileEdit /></SuspensePage></ProtectedRoute>} />
        <Route path="/profile/:userId" element={<ProtectedRoute><SuspensePage><UserProfileView /></SuspensePage></ProtectedRoute>} />
        <Route path="/subscription" element={<ProtectedRoute><SuspensePage><Subscription /></SuspensePage></ProtectedRoute>} />
        <Route path="/profile/viewers" element={<ProtectedRoute><SuspensePage><ProfileViewers /></SuspensePage></ProtectedRoute>} />
        <Route path="/boost" element={<ProtectedRoute><SuspensePage><Boost /></SuspensePage></ProtectedRoute>} />
        {/* Settings routes */}
        <Route path="/settings/safety" element={<ProtectedRoute><SuspensePage><SafetyPrivacy /></SuspensePage></ProtectedRoute>} />
        <Route path="/settings/notifications" element={<ProtectedRoute><SuspensePage><NotificationSettings /></SuspensePage></ProtectedRoute>} />
        <Route path="/settings/help" element={<ProtectedRoute><SuspensePage><HelpSupport /></SuspensePage></ProtectedRoute>} />
        <Route path="/settings/help/how-it-works" element={<ProtectedRoute><SuspensePage><HowItWorks /></SuspensePage></ProtectedRoute>} />
        <Route path="/settings/help/location" element={<ProtectedRoute><SuspensePage><LocationUsage /></SuspensePage></ProtectedRoute>} />
        <Route path="/settings/help/premium" element={<ProtectedRoute><SuspensePage><PremiumPayments /></SuspensePage></ProtectedRoute>} />
        <Route path="/settings/help/contact" element={<ProtectedRoute><SuspensePage><ContactUs /></SuspensePage></ProtectedRoute>} />
        <Route path="/settings/help/privacy-policy" element={<ProtectedRoute><SuspensePage><PrivacyPolicy /></SuspensePage></ProtectedRoute>} />
        <Route path="/settings/help/terms" element={<ProtectedRoute><SuspensePage><TermsOfUse /></SuspensePage></ProtectedRoute>} />
        {/* Admin routes */}
        <Route path="/admin" element={<AdminGuard><SuspensePage><AdminDashboard /></SuspensePage></AdminGuard>} />
        <Route path="/admin/users" element={<AdminGuard><SuspensePage><AdminUsers /></SuspensePage></AdminGuard>} />
        <Route path="/admin/reports" element={<AdminGuard><SuspensePage><AdminReports /></SuspensePage></AdminGuard>} />
        <Route path="/admin/moderation" element={<AdminGuard><SuspensePage><AdminModeration /></SuspensePage></AdminGuard>} />
        {/* AdminPayments route removed — Stripe not used */}
        <Route path="/admin/subscriptions" element={<AdminGuard><SuspensePage><AdminSubscriptions /></SuspensePage></AdminGuard>} />
        <Route path="/admin/revenue" element={<AdminGuard><SuspensePage><AdminRevenue /></SuspensePage></AdminGuard>} />
        <Route path="/admin/audit-log" element={<AdminGuard><SuspensePage><AdminAuditLog /></SuspensePage></AdminGuard>} />
        <Route path="/admin/verification" element={<AdminGuard><SuspensePage><AdminVerification /></SuspensePage></AdminGuard>} />
          
          <Route path="*" element={<NotFound />} />
      </Routes>
      {user && !hideBottomNav && <BottomNav />}
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
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
  </ErrorBoundary>
);

export default App;
