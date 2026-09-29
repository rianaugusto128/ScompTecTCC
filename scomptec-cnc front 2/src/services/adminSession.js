// Perfil em cache para apresentar a navegação. O servidor valida cada
// operação administrativa e a página confirma a sessão em /auth/me.
export function readSessionUser() {
  try {
    if (!localStorage.getItem("scomptec_access_token")) return null;
    const user = JSON.parse(localStorage.getItem("scomptec_user") || "null");
    return user && typeof user.name === "string" ? user : null;
  } catch {
    return null;
  }
}

export function isAdminUser(user) {
  return ["admin", "ADMIN", "ADMIN_SCOMPTEC"].includes(user?.role);
}

export function clearSession() {
  localStorage.removeItem("scomptec_access_token");
  localStorage.removeItem("scomptec_user");
}
