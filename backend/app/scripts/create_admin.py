"""
Bootstrap script for creating the first admin user.

Usage:
    ADMIN_EMAIL=admin@example.com \
    ADMIN_PASSWORD=yourpassword \
    ADMIN_NAME="Admin User" \
    python -m app.scripts.create_admin

To promote an existing client account to admin:
    ADMIN_PROMOTE_EXISTING=true \
    ADMIN_EMAIL=existing@example.com \
    ADMIN_PASSWORD=yourpassword \
    ADMIN_NAME="Admin User" \
    python -m app.scripts.create_admin

Environment variables:
    ADMIN_EMAIL              Required. Email for the admin account.
    ADMIN_PASSWORD           Required. Plaintext password (min 8 chars). Stored hashed.
    ADMIN_NAME               Required. Display name for the admin.
    ADMIN_PROMOTE_EXISTING   Optional. Set to 'true' to promote an existing client to admin.
                             Defaults to false — the script exits safely without this flag.
"""

import asyncio
import os
import sys

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, Base, engine
from app.models.user import User, UserRole
from app.services.auth import get_user_by_email, hash_password


async def run_create_admin(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    name: str,
    promote_existing: bool = False,
) -> str:
    """
    Core bootstrap logic. Returns a status message on success, raises RuntimeError on failure.
    Separated from main() so it can be called from tests with an injected session.
    """
    if len(password) < 8:
        raise RuntimeError("ADMIN_PASSWORD must be at least 8 characters.")

    existing = await get_user_by_email(db, email)

    if existing:
        if existing.role == UserRole.admin:
            return f"Already admin: {email} (id={existing.id}). Nothing to do."

        if not promote_existing:
            raise RuntimeError(
                f"{email} already exists as a client user. "
                "Re-run with ADMIN_PROMOTE_EXISTING=true to promote."
            )

        existing.role = UserRole.admin
        await db.commit()
        return f"Promoted existing user to admin: {email} (id={existing.id})"

    user = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role=UserRole.admin,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return f"Admin created: {email} (id={user.id})"


async def main() -> None:
    email = os.environ.get("ADMIN_EMAIL", "").strip()
    password = os.environ.get("ADMIN_PASSWORD", "").strip()
    name = os.environ.get("ADMIN_NAME", "").strip()
    promote_existing = os.environ.get("ADMIN_PROMOTE_EXISTING", "").lower() == "true"

    missing = [k for k, v in {"ADMIN_EMAIL": email, "ADMIN_PASSWORD": password, "ADMIN_NAME": name}.items() if not v]
    if missing:
        print(f"Error: missing required env vars: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)

    # Ensure tables exist (safe to call on an already-initialised DB)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        try:
            msg = await run_create_admin(db, email=email, password=password, name=name, promote_existing=promote_existing)
            print(msg)
        except RuntimeError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
