from datetime import timezone
import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from Database.Connection import get_db
from Database.models import AdminAudit, AdminIncident, AdminRules, CNC, User
from Schema.admin import AdminUserCreate, AdminUserUpdate, AlertRules, IncidentCreate, IncidentUpdate
from Services.authservice import get_current_user
from Services.security import hash_password

ADMIN_ROLES = {"admin", "ADMIN", "ADMIN_SCOMPTEC"}


def require_admin(user: User = Depends(get_current_user)):
    if user.role not in ADMIN_ROLES:
        raise HTTPException(403, "Seu perfil não possui acesso administrativo")
    return user


router = APIRouter(prefix="/admin", tags=["Administração"], dependencies=[Depends(require_admin)])


def managed_by_env(user):
    return bool(os.getenv("ADMIN_PASSWORD")) and user.email.lower() == os.getenv("ADMIN_EMAIL", "").strip().lower()


def iso(value):
    return value.replace(tzinfo=timezone.utc).isoformat()


def snapshot(db):
    rules = db.get(AdminRules, 1)
    return {
        "users": [{"id": u.id, "name": u.name, "email": u.email,
                   "role": "admin" if u.role in ADMIN_ROLES else ("viewer" if u.role == "CLIENTE" else u.role),
                   "active": u.is_active, "managedByEnv": managed_by_env(u)} for u in db.scalars(select(User).order_by(User.name))],
        "incidents": [{"id": i.id, "machineId": i.machine_code, "machineBackendId": i.machine_id,
                       "title": i.title, "priority": i.priority, "status": i.status,
                       "assignee": i.assignee, "note": i.note, "attendance": i.attendance,
                       "createdAt": iso(i.created_at)}
                      for i in db.scalars(select(AdminIncident).order_by(AdminIncident.created_at.desc(), AdminIncident.id))],
        "rules": rules.values if rules else AlertRules().model_dump(),
        "audit": [{"id": a.id, "action": a.action, "at": iso(a.at), "actor": a.actor_name}
                  for a in db.scalars(select(AdminAudit).order_by(AdminAudit.at.desc(), AdminAudit.id))],
    }


def finish(db, actor, action):
    db.add(AdminAudit(actor_id=actor.id, actor_name=actor.name, action=action))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Os dados já existem ou foram alterados. Atualize a página e tente novamente.")
    return snapshot(db)


def validate_assignee(db, assignee):
    if assignee:
        user = db.get(User, assignee)
        if not user or not user.is_active:
            raise HTTPException(422, "Selecione um responsável ativo")


@router.get("/state")
def get_state(db: Session = Depends(get_db)):
    return snapshot(db)


@router.post("/users", status_code=201)
def create_user(data: AdminUserCreate, db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    name, email = data.name.strip(), str(data.email).lower()
    if len(name) < 2:
        raise HTTPException(422, "Informe um nome com pelo menos 2 caracteres")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Já existe uma conta para este e-mail")
    db.add(User(name=name, email=email, role=data.role, password_hash=hash_password(data.password)))
    return finish(db, actor, f"Usuário {name} criado ({data.role})")


@router.patch("/users/{user_id}")
def update_user(user_id: str, data: AdminUserUpdate, db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    if managed_by_env(user):
        raise HTTPException(409, "Esta conta é gerenciada pelo .env do servidor e deve permanecer como administrador ativo")
    if user.id == actor.id and data.role is not None and data.role != "admin":
        raise HTTPException(409, "Você não pode remover o próprio acesso administrativo")
    if data.active is False:
        if user.id == actor.id:
            raise HTTPException(409, "Você não pode desativar a própria conta")
        if db.scalar(select(AdminIncident).where(AdminIncident.assignee == user.id, AdminIncident.status != "Resolvida")):
            raise HTTPException(409, "Reatribua as ocorrências abertas antes de desativar este usuário")
    changes = []
    if data.active is not None:
        user.is_active = data.active
        changes.append("reativado" if data.active else "desativado")
    if data.role is not None:
        labels = {"admin": "Administrador", "maintenance": "Manutenção", "operator": "Operador", "viewer": "Visualizador"}
        previous = "admin" if user.role in ADMIN_ROLES else ("viewer" if user.role == "CLIENTE" else user.role)
        user.role = data.role
        changes.append(f"perfil alterado de {labels.get(previous, previous)} para {labels[data.role]}")
    return finish(db, actor, f"Usuário {user.name}: {'; '.join(changes)}")


@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Usuário não encontrado")
    if user.id == actor.id:
        raise HTTPException(409, "Você não pode excluir a própria conta")
    if managed_by_env(user):
        raise HTTPException(409, "Esta conta é gerenciada pelo .env do servidor e não pode ser excluída aqui")
    if db.scalar(select(AdminIncident).where(AdminIncident.assignee == user.id)):
        raise HTTPException(409, "Este usuário possui ocorrências vinculadas. Reatribua as abertas; se houver atendimentos concluídos, desative a conta para preservar o histórico.")
    name = user.name
    db.delete(user)
    return finish(db, actor, f"Usuário {name} excluído")


@router.post("/incidents", status_code=201)
def create_incident(data: IncidentCreate, db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    cnc = db.get(CNC, data.machineId)
    if not cnc:
        raise HTTPException(422, "Máquina não encontrada")
    validate_assignee(db, data.assignee)
    db.add(AdminIncident(machine_id=cnc.id, machine_code=cnc.code, title=data.title,
                         priority=data.priority, assignee=data.assignee, note=data.note))
    return finish(db, actor, f"Ocorrência registrada em {cnc.code}: {data.title}")


@router.patch("/incidents/{incident_id}")
def update_incident(incident_id: str, data: IncidentUpdate, db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    incident = db.get(AdminIncident, incident_id)
    if not incident:
        raise HTTPException(404, "Ocorrência não encontrada")
    changes = data.model_dump(exclude_unset=True)
    if "assignee" in changes:
        validate_assignee(db, data.assignee)
    if changes.get("status", incident.status) == "Resolvida":
        if not changes.get("assignee", incident.assignee) or not changes.get("attendance", incident.attendance).strip():
            raise HTTPException(422, "Para resolver, selecione um responsável e registre o atendimento")
    for key, value in changes.items():
        setattr(incident, key, value)
    labels = {"status": "andamento", "assignee": "responsável", "attendance": "atendimento"}
    return finish(db, actor, f"Ocorrência {incident.title}: {', '.join(labels[key] for key in changes)} atualizado")


@router.put("/rules")
def save_rules(data: AlertRules, db: Session = Depends(get_db), actor: User = Depends(require_admin)):
    rules = db.get(AdminRules, 1)
    if rules:
        rules.values = data.model_dump()
    else:
        db.add(AdminRules(id=1, values=data.model_dump()))
    return finish(db, actor, "Limites de alerta atualizados")
