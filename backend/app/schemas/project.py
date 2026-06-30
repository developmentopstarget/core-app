from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

ProjectStatus = Literal["active", "paused", "completed", "cancelled"]


class MilestoneResponse(BaseModel):
    id: int
    title: str = Field(min_length=1, max_length=200)
    is_done: bool
    sort_order: int

    model_config = {"from_attributes": True}


class MilestoneCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    is_done: bool = False
    sort_order: int = 0


class MilestoneUpdate(BaseModel):
    title: str | None = None
    is_done: bool | None = None
    sort_order: int | None = None


class MilestoneUpsert(MilestoneCreate):
    id: int | None = None


class ProjectResponse(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    progress: int = Field(ge=0, le=100)
    preview_url: str | None
    notes: str | None
    owner_id: int
    created_at: datetime
    updated_at: datetime
    milestones: list[MilestoneResponse] = []

    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    title: str
    description: str | None = None
    status: ProjectStatus = "active"
    progress: int = Field(default=0, ge=0, le=100)
    preview_url: HttpUrl | None = None
    notes: str | None = None
    owner_id: int
    milestones: list[MilestoneCreate] = []


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    status: ProjectStatus | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    preview_url: HttpUrl | None = None
    notes: str | None = None
    owner_id: int | None = None
    milestones: list[MilestoneUpsert] | None = None
