"""Roles and privileges (SPEC-011).

The requirement this file encodes, stated plainly:

* Osama is a UAA faculty member and the responsible party for the money.
  **His account is the only one that ever has access to funds**, and he is the
  only one who can grant that access to anyone else.
* Rad is a maintainer with full operational admin, and can create developer
  accounts for other student workers who contribute — but never touches funds
  and can never mint a faculty or admin account.
* Staff of every kind read the course for free; only learners pay.

Two decisions are worth naming because they are not the obvious ones:

1. **Funds access is a column, not a role.** "Exactly one account may hold it"
   is not something a role can express — roles are many-to-one by nature, and
   the moment a second admin exists a role-implied privilege leaks. A dedicated
   `can_access_funds` flag can be held by one row and audited with one query.

2. **Grant authority is derived from the privilege itself, not from rank.**
   Only an account that *has* funds access may grant it. That is a strictly
   stronger rule than "only the owner role may grant it": it holds even if
   someone is later promoted to `owner`, and it makes the invariant
   self-enforcing rather than dependent on the role table staying correct.
"""

from dataclasses import dataclass

# ── Role identifiers ─────────────────────────────────────────────────────────

ROLE_LEARNER = "learner"
ROLE_DEVELOPER = "developer"
ROLE_INSTRUCTOR = "instructor"
ROLE_ADMIN = "admin"
ROLE_OWNER = "owner"

ALL_ROLES = (ROLE_LEARNER, ROLE_DEVELOPER, ROLE_INSTRUCTOR, ROLE_ADMIN, ROLE_OWNER)

#: Roles that read the whole course without paying. "Admins must not have to
#: pay" generalised: nobody who works on or teaches the course is billed for it.
STAFF_ROLES = frozenset({ROLE_DEVELOPER, ROLE_INSTRUCTOR, ROLE_ADMIN, ROLE_OWNER})

#: Roles that can open the instructor dashboard and the learner CSV export.
#: Developers are excluded on purpose — a student worker contributing UI code
#: has no business reading classmates' progress records.
INSTRUCTOR_VIEW_ROLES = frozenset({ROLE_INSTRUCTOR, ROLE_ADMIN, ROLE_OWNER})

#: Roles that can reach the admin surface at all.
ADMIN_ROLES = frozenset({ROLE_ADMIN, ROLE_OWNER})

#: Which roles each role may hand out when creating or editing an account.
#: Read this table as the authoritative answer to "who can make what".
GRANTABLE_ROLES: dict[str, frozenset[str]] = {
    # Osama: everything, including other faculty and other admins.
    ROLE_OWNER: frozenset({ROLE_LEARNER, ROLE_DEVELOPER, ROLE_INSTRUCTOR, ROLE_ADMIN}),
    # Rad: student-worker developer accounts and ordinary learners. Explicitly
    # NOT instructor and NOT admin — minting UAA faculty accounts is Osama's
    # call alone, because faculty status is a university-side fact.
    ROLE_ADMIN: frozenset({ROLE_LEARNER, ROLE_DEVELOPER}),
    ROLE_INSTRUCTOR: frozenset(),
    ROLE_DEVELOPER: frozenset(),
    ROLE_LEARNER: frozenset(),
}


@dataclass(frozen=True)
class RoleInfo:
    key: str
    label: str
    blurb: str


ROLE_CATALOG: tuple[RoleInfo, ...] = (
    RoleInfo(ROLE_LEARNER, "Learner", "Takes the course. Pays for access."),
    RoleInfo(
        ROLE_DEVELOPER,
        "Developer",
        "Student worker contributing to the build. Free access, no learner data.",
    ),
    RoleInfo(
        ROLE_INSTRUCTOR,
        "Instructor",
        "UAA faculty teaching the course. Free access and the instructor dashboard.",
    ),
    RoleInfo(
        ROLE_ADMIN,
        "Admin",
        "Full operational admin. Can create learner and developer accounts. No funds access.",
    ),
    RoleInfo(
        ROLE_OWNER,
        "Owner (faculty)",
        "Responsible faculty member. The only account permitted funds access.",
    ),
)


# ── Predicates ───────────────────────────────────────────────────────────────


def is_staff(role: str) -> bool:
    return role in STAFF_ROLES


def may_view_instructor_area(role: str) -> bool:
    return role in INSTRUCTOR_VIEW_ROLES


def may_use_admin_area(role: str) -> bool:
    return role in ADMIN_ROLES


def grantable_roles(actor_role: str) -> frozenset[str]:
    return GRANTABLE_ROLES.get(actor_role, frozenset())


def may_grant_role(actor_role: str, target_role: str) -> bool:
    return target_role in grantable_roles(actor_role)


def may_grant_funds_access(actor_can_access_funds: bool) -> bool:
    """Only an account that already holds funds access may confer it.

    Note the argument is the *privilege*, not the role. Rad is `admin` and can
    never satisfy this, no matter what else changes about the role table; a
    future second owner still could not grant it unless Osama first gave them
    the flag directly.
    """
    return bool(actor_can_access_funds)


def role_from_email(
    email: str,
    *,
    owner_email: str,
    admin_emails: set[str],
    instructor_emails: set[str],
    developer_emails: set[str],
) -> str:
    """Role assigned at self-registration, by configured email allowlists.

    Checked most-privileged first so an address listed twice resolves to the
    higher role rather than to whichever branch happened to run first.

    Self-registration is the weakest way to obtain a role — it trusts an
    unverified email address — so it is deliberately limited to addresses the
    operator has already written into configuration. Everything else that
    arrives at /register is a learner.
    """
    normalised = email.strip().lower()
    if owner_email and normalised == owner_email.strip().lower():
        return ROLE_OWNER
    if normalised in admin_emails:
        return ROLE_ADMIN
    if normalised in instructor_emails:
        return ROLE_INSTRUCTOR
    if normalised in developer_emails:
        return ROLE_DEVELOPER
    return ROLE_LEARNER
