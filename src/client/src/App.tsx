import { Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { MonitorPage } from './pages/MonitorPage';

export default function App() {
  const location = useLocation();
  const isAnalytics = location.pathname === '/analytics';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div
        className={`mx-auto px-4 py-8 ${isAnalytics ? 'max-w-5xl' : 'max-w-2xl'}`}
      >
        <Header />

        <main className="space-y-6">
          <Routes>
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/" element={<MonitorPage />} />
          </Routes>
        </main>

        <footer className="mt-12 text-center text-sm text-zinc-500">
          Throat clearing detection · Browser audio
        </footer>
      </div>
    </div>
  );
}
