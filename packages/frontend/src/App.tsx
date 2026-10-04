import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import CampaignPage from "@/pages/CampaignPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/campaign/:address" element={<CampaignPage />} />
      </Routes>
    </BrowserRouter>
  );
}
