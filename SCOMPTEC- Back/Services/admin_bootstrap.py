"""Sincroniza a conta administrativa configurada no ambiente do servidor."""
import os

from pydantic import ValidationError
from sqlalchemy import select

from Database.models import AdminAudit, User
from Schema.admin import AdminUserCreate
from Services.security import hash_password, verify_password


def sync_admin(db):
    email = os.getenv("ADMIN_EMAIL", "").strip()
    password = os.getenv("ADMIN_PASSWORD", "")
    if not email and not password:
        return
    try:
        data = AdminUserCreate(name=os.getenv("ADMIN_NAME", "Administrador").strip(),
                               email=email, password=password, role="admin")
    except ValidationError:
        # Não expor os valores de configuração (especialmente senha) nos logs.
        raise RuntimeError("Configure ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD válidos no .env do backend (senha de 8 a 128 caracteres).") from None
    user = db.scalar(select(User).where(User.email == str(data.email).lower()))
    created = user is None
    if created:
        user = User(email=str(data.email).lower(), name=data.name, role="admin",
                    is_active=True, password_hash=hash_password(data.password))
        db.add(user)
    else:
        changed = (user.name != data.name or user.role != "admin" or not user.is_active
                   or not verify_password(data.password, user.password_hash))
        if not changed:
            return
        user.name, user.role, user.is_active = data.name, "admin", True
        if not verify_password(data.password, user.password_hash):
            user.password_hash = hash_password(data.password)
    db.flush()
    db.add(AdminAudit(actor_id=user.id, actor_name="Configuração do servidor",
                      action=f"Administrador {user.name} {'criado' if created else 'atualizado'} pela configuração do servidor"))
    db.commit()
