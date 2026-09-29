import { Outlet } from "react-router-dom";
import ConnectionNotice from "../../components/ConnectionNotice/ConnectionNotice";
import { usePreferences } from "../../services/preferences";

// Layout minimalista para o Modo TV — sem sidebar, otimizado para leitura à distância.
export default function TVLayout() {
  const preferences = usePreferences();
  return (
    <div data-reduce-motion={preferences.reduceMotion} className="min-h-screen bg-base-bg">
      <ConnectionNotice />
      <Outlet />
    </div>
  );
}
