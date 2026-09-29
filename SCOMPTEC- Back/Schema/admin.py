from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from Schema.auth import RegisterRequest

Role = Literal["admin", "maintenance", "operator", "viewer"]


class AdminUserCreate(RegisterRequest):
    role: Role = "operator"


class AdminUserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    active: bool | None = None
    role: Role | None = None

    @model_validator(mode="after")
    def non_null_changes(self):
        if not self.model_fields_set or any(getattr(self, key) is None for key in self.model_fields_set):
            raise ValueError("Informe um perfil ou status válido")
        return self


class IncidentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    machineId: str = Field(min_length=1, max_length=36)
    title: str = Field(min_length=1, max_length=180)
    priority: Literal["Crítica", "Alta", "Média", "Baixa"] = "Alta"
    assignee: str = Field(default="", max_length=36)
    note: str = Field(default="", max_length=2000)


class IncidentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    status: Literal["Aberta", "Em atendimento", "Resolvida"] | None = None
    assignee: str | None = Field(default=None, max_length=36)
    attendance: str | None = Field(default=None, min_length=1, max_length=2000)

    @model_validator(mode="after")
    def non_null_changes(self):
        if not self.model_fields_set or any(getattr(self, key) is None for key in self.model_fields_set):
            raise ValueError("Informe uma alteração válida")
        return self


class AlertRules(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    current: float = Field(default=22, gt=0)
    temperature: float = Field(default=65, gt=0)
    voltageMin: float = Field(default=200, gt=0)
    voltageMax: float = Field(default=240, gt=0)

    @model_validator(mode="after")
    def voltage_range(self):
        if self.voltageMin >= self.voltageMax:
            raise ValueError("Tensão mínima deve ser menor que a máxima")
        return self
