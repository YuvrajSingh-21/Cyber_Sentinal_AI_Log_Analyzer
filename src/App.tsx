// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import Index from "./pages/Index";
// import NotFound from "./pages/NotFound";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// const queryClient = new QueryClient();

// const App = () => (
//   <QueryClientProvider client={queryClient}>
//     <TooltipProvider>
//       <Toaster />
//       <Sonner />
//       <BrowserRouter>
//         <Routes>
//           <Route path="/" element={<Index />}>
//             <Route index element={<Navigate to="/dashboard" replace />} />
//             <Route path="dashboard" element={<div />} />
//             <Route path="logs" element={<div />} />
//             <Route path="upload" element={<div />} />
//             <Route path="anomalies" element={<div />} />
//             <Route path="timeline" element={<div />} />
//             <Route path="reports" element={<div />} />
//             <Route path="settings" element={<div />} />
//           </Route>

//           <Route path="*" element={<NotFound />} />
//         </Routes>
//       </BrowserRouter>

//     </TooltipProvider>
//   </QueryClientProvider>
// );

// export default App;
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Routes>
            {/* Layout */}
            <Route path="/" element={<Index />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={null} />
              <Route path="logs" element={null} />
              <Route path="upload" element={null} />
              <Route path="anomalies" element={null} />
              <Route path="timeline" element={null} />
              <Route path="reports" element={null} />
              <Route path="settings" element={null} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
