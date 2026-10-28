import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Landing from './pages/Landing.jsx'
import NewCheck from './pages/NewCheck.jsx'
import MySubmissions from './pages/MySubmissions.jsx'
import BrandLibrary from './pages/BrandLibrary.jsx'
import ReviewQueue from './pages/ReviewQueue.jsx'
import SubmissionDetail from './pages/SubmissionDetail.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<Layout />}>
        <Route path="/check" element={<NewCheck />} />
        <Route path="/submissions" element={<MySubmissions />} />
        <Route path="/submission/:id" element={<SubmissionDetail />} />
        <Route path="/brand" element={<BrandLibrary />} />
        <Route path="/queue" element={<ReviewQueue />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
