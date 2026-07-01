# ORM modeling

## Declarative models with `Mapped`/`mapped_column`

This is the 2.0 typed style — the type annotation on `Mapped[...]` drives both the Python
type and (via type-mapping conventions) the SQL column type when not given explicitly:
```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))          # explicit length
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)  # `| None` -> nullable
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
```
`Mapped[str | None]` is sufficient to make a column nullable — `mapped_column(nullable=True)`
is redundant but harmless when the type already says so; don't fight the two into
disagreement (e.g. `Mapped[str]` with `nullable=True` — SQLAlchemy trusts `mapped_column`
over the annotation, which is a footgun. Keep them consistent.

`default=` runs client-side (in Python) before INSERT; `server_default=` runs in the
database (needed if other things — direct SQL, other apps — write to the table too).
`onupdate=` (client-side) / `server_onupdate=` mirror this for UPDATEs — this repo's
`Project.updated_at` uses `onupdate=lambda: datetime.now(UTC)`, which only fires when the
*ORM* issues the UPDATE, not on raw SQL updates.

## Relationships

### One-to-many
```python
class Project(Base):
    milestones: Mapped[list["Milestone"]] = relationship(
        "Milestone", back_populates="project", cascade="all, delete-orphan",
        order_by="Milestone.sort_order",
    )

class Milestone(Base):
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    project: Mapped["Project"] = relationship("Project", back_populates="milestones")
```
`back_populates` (not the older `backref`) on both sides keeps the relationship
bidirectionally in sync in memory — appending to `project.milestones` sets
`milestone.project` automatically, no flush required. Always index foreign key columns
(`ForeignKey(...)` alone does **not** create an index).

### Many-to-many
Requires an association table (plain `Table`, not a mapped class, unless the association
itself needs extra columns):
```python
project_tags = Table(
    "project_tags", Base.metadata,
    Column("project_id", ForeignKey("projects.id"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id"), primary_key=True),
)

class Project(Base):
    tags: Mapped[list["Tag"]] = relationship(secondary=project_tags, back_populates="projects")
```
If the association needs its own columns (e.g. `added_at`), map it as a full class instead
of `secondary=` and use an "association object" pattern with two one-to-many relationships.

### String forward-refs
`relationship("Milestone", ...)` and `Mapped["Project"]` as strings avoid circular import
errors between model modules that reference each other — this is why this repo's models
use string names even though the class exists in the same file (consistency + it also
works fine across files without importing the other module directly, as long as both
classes register with the same `Base` before any query using them runs — ensure all model
modules get imported somewhere at startup, which is why `alembic/env.py` does
`import app.models  # noqa: F401`, and `app/main.py`'s router imports transitively pull
in every model module).

## Cascades

`cascade="all, delete-orphan"` (as used on `Project.milestones`) means: deleting the
parent deletes its children, and *removing a child from the collection* (not just
deleting the parent) also deletes that child row. This is usually what you want for
strict parent-owns-child relationships (a milestone has no meaning without its project).

Don't use `"all, delete-orphan"` on relationships where the child can legitimately be
reassigned or exist independently — use the default cascade (`save-update, merge`) there,
and delete children explicitly in a service function instead. `delete-orphan` on a
relationship with `secondary=` (many-to-many) is invalid — SQLAlchemy raises at mapper
configuration time.

## Inheritance (if ever needed)

Three strategies: **single table** (one table, a `type` discriminator column, all
subclass columns nullable — simplest, fastest queries, wastes space for divergent
subclasses), **joined table** (a table per subclass, joined by shared PK — normalized, no
wasted columns, requires a JOIN per subclass query), **concrete table** (fully separate
tables, no shared querying across the hierarchy — rarely what you want). Default to
single-table inheritance unless subclasses diverge heavily in columns; this repo doesn't
currently use inheritance — introduce it only if a real polymorphic need (e.g. multiple
milestone "kinds" with different fields) shows up, not preemptively.

## Mixins

A plain (non-mapped) class with `Mapped`/`mapped_column` attributes, inherited alongside
`Base`, factors out repeated columns:
```python
class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

class Project(TimestampMixin, Base):
    __tablename__ = "projects"
    ...
```
If this repo grows more models needing `created_at`/`updated_at` (several already
duplicate this pattern), extracting a `TimestampMixin` into `app/models/` is a reasonable
refactor — but don't do it speculatively for a single model.

## Enums

This repo stores `UserRole` (a `StrEnum`) as `mapped_column(String(20), default=UserRole.client)`
— a plain string column, not SQLAlchemy's `Enum` type. This is deliberate: SQLAlchemy's
`Enum` type creates a native `ENUM` type in PostgreSQL, which Alembic's autogenerate
**cannot reliably detect changes to** (adding/removing a value requires a manual
migration either way) and complicates SQLite compatibility. Follow the existing
string-column-backed-by-a-Python-enum pattern for new enum-like fields rather than
switching to `sa.Enum`.
