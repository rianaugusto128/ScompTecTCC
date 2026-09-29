"""Cria uma conta administrativa pelo terminal do servidor, sem senha padrão."""
from getpass import getpass

from sqlalchemy import select
from pydantic import ValidationError

from Database.Connection import SessionLocal, create_tables
from Database.models import AdminAudit, User
from Schema.admin import AdminUserCreate
from Services.security import hash_password


def main():
    try:
        name = input("Nome do administrador: ").strip()
        email = input("E-mail: ").strip()
        password = getpass("Senha (mínimo 8 caracteres): ")
        if password != getpass("Confirme a senha: "):
            raise ValueError("As senhas não conferem")
        data = AdminUserCreate(name=name, email=email, password=password, role="admin")
    except (ValidationError, ValueError):
        raise SystemExit("Dados inválidos. Confira nome, e-mail e senha (8 a 128 caracteres).")
    create_tables()
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == str(data.email).lower())):
            raise SystemExit("Este e-mail já existe. Use um e-mail novo para criar o administrador.")
        user = User(name=data.name, email=str(data.email).lower(), role="admin", password_hash=hash_password(data.password))
        db.add(user)
        db.flush()
        db.add(AdminAudit(actor_id=user.id, actor_name=user.name, action="Administrador inicial criado pelo terminal do servidor"))
        db.commit()
    print("Administrador criado. Entre pelo login do sistema e abra Central administrativa.")


if __name__ == "__main__":
    main()
