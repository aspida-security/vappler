import React from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Routes from "./Routes";

// This new component is our "loading gate"
const AppContent = () => {
  const { loading } = useAuth();

  if (loading) {
    // This is shown to the user while Supabase checks the session
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing Session...</p>
        </div>
      </div>
    );
  }

  // Once loading is false, we show the actual app routes
  return <Routes />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;