"""Standardized error response format for the API."""

from fastapi import HTTPException


class AppError(HTTPException):
    """
    Application error with structured detail payload.

    Always produces:
        {"detail": {"message": "...", "code": "..."}}

    Usage:
        raise AppError(404, "案件が見つかりません", "PROJECT_NOT_FOUND")
        raise AppError(400, "ファイル形式が不正です", "INVALID_FILE_TYPE")
        raise AppError(403, "権限がありません", "FORBIDDEN")
    """

    def __init__(self, status_code: int, message: str, code: str = ""):
        super().__init__(
            status_code=status_code,
            detail={"message": message, "code": code or _default_code(status_code)},
        )


def _default_code(status_code: int) -> str:
    """Return a generic error code for common HTTP status codes."""
    return {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
        500: "INTERNAL_ERROR",
    }.get(status_code, "ERROR")


# Convenience constructors for the most common cases
def not_found(message: str, code: str = "NOT_FOUND") -> AppError:
    return AppError(404, message, code)


def forbidden(message: str = "権限がありません", code: str = "FORBIDDEN") -> AppError:
    return AppError(403, message, code)


def bad_request(message: str, code: str = "BAD_REQUEST") -> AppError:
    return AppError(400, message, code)


def conflict(message: str, code: str = "CONFLICT") -> AppError:
    return AppError(409, message, code)
