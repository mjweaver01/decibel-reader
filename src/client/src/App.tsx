import { Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { MonitorPage } from './pages/MonitorPage';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto px-4 py-8 max-w-5xl">
        <Header />

        <main className="space-y-4 md:space-y-6">
          <Routes>
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/" element={<MonitorPage />} />
          </Routes>
        </main>

        <footer className="mt-12 text-center text-sm text-zinc-500">
          Decibel Reader · Browser audio
        </footer>
      </div>
    </div>
  );
}
