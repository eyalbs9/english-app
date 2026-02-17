import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import UserSelect from "./pages/UserSelect";
import Dashboard from "./pages/Dashboard";
import Flashcards from "./pages/Flashcards";
import WordMatching from "./pages/WordMatching";
import Dictation from "./pages/Dictation";
import LoadVocabulary from "./pages/LoadVocabulary";
import StoryReader from "./pages/StoryReader";
import Management from "./pages/Management";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<UserSelect />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/matching" element={<WordMatching />} />
            <Route path="/dictation" element={<Dictation />} />
            <Route path="/load-vocabulary" element={<LoadVocabulary />} />
            <Route path="/story" element={<StoryReader />} />
            <Route path="/management" element={<Management />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
