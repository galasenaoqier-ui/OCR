import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import ProjectIntroPage from './pages/ProjectIntroPage'
import RecognizePage from './pages/RecognizePage'
import LibraryPage from './pages/LibraryPage'
import MyLibraryPage from './pages/MyLibraryPage'
import CharacterPage from './pages/CharacterPage'
import EvolutionPage from './pages/EvolutionPage'
import ComparePage from './pages/ComparePage'
import KnowledgePage from './pages/KnowledgePage'
import LearningPage from './pages/LearningPage'
import DataPage from './pages/DataPage'
import DigitalScholarPage from './pages/DigitalScholarPage'
import DemoPage from './pages/DemoPage'
import StatusPage from './pages/StatusPage'
import HustPage from './pages/HustPage'
import SharePage from './pages/SharePage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 pt-16">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<ProjectIntroPage />} />
            <Route path="/recognize" element={<RecognizePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/my-library" element={<MyLibraryPage />} />
            <Route path="/character/:id" element={<CharacterPage />} />
            <Route path="/hust/:entryId" element={<HustPage />} />
            <Route path="/evolution" element={<EvolutionPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/digital-human" element={<DigitalScholarPage />} />
            <Route path="/learning" element={<LearningPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/share" element={<SharePage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  )
}
