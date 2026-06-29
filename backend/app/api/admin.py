from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.models.project import Milestone, Project
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.project import MilestoneCreate, MilestoneUpdate, ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Users ──────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


# ── Projects ───────────────────────────────────────────────────────────────────

@router.get("/projects", response_model=list[ProjectResponse])
async def list_all_projects(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> list[Project]:
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.milestones))
        .order_by(Project.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Project:
    owner = await db.get(User, payload.owner_id)
    if not owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")

    project = Project(
        title=payload.title,
        description=payload.description,
        status=payload.status,
        progress=payload.progress,
        preview_url=payload.preview_url,
        notes=payload.notes,
        owner_id=payload.owner_id,
    )
    db.add(project)
    await db.flush()

    for i, ms in enumerate(payload.milestones):
        db.add(Milestone(project_id=project.id, title=ms.title, is_done=ms.is_done, sort_order=ms.sort_order or i))

    await db.commit()
    await db.refresh(project)

    result = await db.execute(
        select(Project).where(Project.id == project.id).options(selectinload(Project.milestones))
    )
    return result.scalar_one()


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    payload: ProjectUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id).options(selectinload(Project.milestones))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if payload.owner_id is not None:
        owner = await db.get(User, payload.owner_id)
        if not owner:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Owner not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)

    result = await db.execute(
        select(Project).where(Project.id == project_id).options(selectinload(Project.milestones))
    )
    return result.scalar_one()


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await db.delete(project)
    await db.commit()


# ── Milestones ─────────────────────────────────────────────────────────────────

@router.post("/projects/{project_id}/milestones", response_model=ProjectResponse)
async def add_milestone(
    project_id: int,
    payload: MilestoneCreate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    db.add(Milestone(project_id=project_id, title=payload.title, is_done=payload.is_done, sort_order=payload.sort_order))
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()

    result = await db.execute(
        select(Project).where(Project.id == project_id).options(selectinload(Project.milestones))
    )
    return result.scalar_one()


@router.patch("/milestones/{milestone_id}", response_model=ProjectResponse)
async def update_milestone(
    milestone_id: int,
    payload: MilestoneUpdate,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Project:
    result = await db.execute(select(Milestone).where(Milestone.id == milestone_id))
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(milestone, field, value)

    project_id = milestone.project_id
    result2 = await db.execute(select(Project).where(Project.id == project_id))
    proj = result2.scalar_one()
    proj.updated_at = datetime.now(timezone.utc)
    await db.commit()

    result3 = await db.execute(
        select(Project).where(Project.id == project_id).options(selectinload(Project.milestones))
    )
    return result3.scalar_one()


@router.delete("/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_milestone(
    milestone_id: int,
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(Milestone).where(Milestone.id == milestone_id))
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
    await db.delete(milestone)
    await db.commit()
