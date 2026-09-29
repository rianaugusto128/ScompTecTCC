import { useState } from "react";
import { roles } from "./adminModel";

export default function AdminUserRow({ user, ownAccount, onSaveRole, onToggle, onDelete }) {
  const [role, setRole] = useState(user.role);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const protectedAccount = ownAccount || user.managedByEnv;
  return <tr>
    <td><strong>{user.name}</strong><span className="block text-xs text-text-muted">{user.email}</span>{protectedAccount && <span className="block text-xs text-text-muted mt-1">{user.managedByEnv ? "Conta gerenciada pelo servidor" : "Sua conta"}</span>}</td>
    <td><div className="space-y-2 min-w-40"><select className="input-field" aria-label={`Perfil de ${user.name}`} disabled={protectedAccount} value={role} onChange={(event) => setRole(event.target.value)}>{Object.entries(roles).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{role !== user.role && <div className="flex flex-wrap gap-2"><button className="btn-secondary" type="button" onClick={() => onSaveRole(user, role)}>Salvar perfil</button><button className="btn-ghost" type="button" onClick={() => setRole(user.role)}>Cancelar</button></div>}</div></td>
    <td>{user.active ? "Ativo" : "Inativo"}</td>
    <td><div className="flex flex-wrap gap-2"><button className="btn-ghost" type="button" disabled={protectedAccount} onClick={() => onToggle(user)} aria-label={`${user.active ? "Desativar" : "Reativar"} ${user.name}`}>{user.active ? "Desativar" : "Reativar"}</button><button className="btn-ghost text-rose-300" type="button" disabled={protectedAccount} onClick={() => setConfirmDelete(true)} aria-label={`Excluir ${user.name}`}>Excluir</button></div>
      {confirmDelete && <div className="admin-error mt-3 space-y-3" role="group" aria-label={`Confirmar exclusão de ${user.name}`}><p>Excluir a conta de <strong>{user.name}</strong> ({user.email})? O acesso será removido e a ação não poderá ser desfeita.</p><p>Para suspender o acesso e manter o cadastro, use Desativar.</p><div className="flex flex-wrap gap-2"><button className="btn-secondary" type="button" onClick={() => setConfirmDelete(false)}>Cancelar</button><button className="btn-secondary text-rose-300" type="button" onClick={async () => { if (await onDelete(user)) setConfirmDelete(false); }}>Confirmar exclusão</button></div></div>}
    </td>
  </tr>;
}
