import { Routes, Route, Navigate } from "react-router-dom";

import Splash from "./pages/Splash/Splash";
import Landing from "./pages/Landing/Landing";
import Login from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import CompanySelection from "./pages/CompanySelection/CompanySelection";

import DashboardLayout from "./layouts/DashboardLayout/DashboardLayout";
import Dashboard from "./pages/Dashboard/Dashboard";
import Machines from "./pages/Machines/Machines";
import MachineDetails from "./pages/MachineDetails/MachineDetails";
import Alerts from "./pages/Alerts/Alerts";
import History from "./pages/History/History";
import Clients from "./pages/Clients/Clients";
import Units from "./pages/Units/Units";
import Devices from "./pages/Devices/Devices";
import Settings from "./pages/Settings/Settings";
import Admin from "./pages/Admin/Admin";
import AdminAccess from "./pages/Admin/AdminAccess";

import TVLayout from "./layouts/TVLayout/TVLayout";
import TVDashboard from "./pages/TVDashboard/TVDashboard";
import { MonitoringProvider } from "./contexts/MonitoringContext";

export default function App() {
  return (
    <MonitoringProvider>
    <Routes>
      {/* Fluxo de acesso */}
      <Route path="/" element={<Splash />} />
      <Route path="/inicio" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/selecionar-empresa" element={<CompanySelection />} />

      {/* Área interna (dashboard) */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/maquinas" element={<Machines />} />
        <Route path="/maquinas/:id" element={<MachineDetails />} />
        <Route path="/alertas" element={<Alerts />} />
        <Route path="/historico" element={<History />} />
        <Route path="/clientes" element={<Clients />} />
        <Route path="/unidades" element={<Units />} />
        <Route path="/dispositivos" element={<Devices />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="/admin" element={<AdminAccess><Admin /></AdminAccess>} />
      </Route>

      {/* Modo TV */}
      <Route element={<TVLayout />}>
        <Route path="/tv" element={<TVDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </MonitoringProvider>
  );
}
