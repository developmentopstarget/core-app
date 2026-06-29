from datetime import datetime

from pydantic import BaseModel, Field


class MilestoneResponse(BaseModel):
    id: int
    title: str
    is_done: bool
    sort_order: int

    model_config = {"from_attributes": True}


class MilestoneCreate(BaseModel):
    title: str
    is_done: bool = False
    sort_order: int = 0


class MilestoneUpdate(BaseModel):
    title: str | None = None
    is_done: bool | None = None
    sort_order: int | None = None


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
    status: str = "active"
    progress: int = Field(default=0, ge=0, le=100)
    preview_url: str | None = None
    notes: str | None = None
    owner_id: int
    milestones: list[MilestoneCreate] = []


class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    preview_url: str | None = None
    notes: str | None = None
    owner_id: int | None = None
