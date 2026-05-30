import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import "./index.css"
import ComparePage from "@/routes/ComparePage"

const basename = import.meta.env.BASE_URL

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to={{
                pathname: "/compare",
                search: window.location.search,
                hash: window.location.hash,
              }}
              replace
            />
          }
        />
        <Route path="/compare" element={<ComparePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
