"""Photo processing service (EXIF, thumbnails)."""

from io import BytesIO
from datetime import datetime

from PIL import Image, ExifTags


def extract_exif(image_data: bytes) -> dict:
    """Extract EXIF data from image bytes."""
    result = {
        "taken_at": None,
        "gps_lat": None,
        "gps_lng": None,
        "width": None,
        "height": None,
    }
    try:
        img = Image.open(BytesIO(image_data))
        result["width"] = img.width
        result["height"] = img.height

        exif_data = img._getexif()
        if not exif_data:
            return result

        exif = {ExifTags.TAGS.get(k, k): v for k, v in exif_data.items()}

        # Date
        date_str = exif.get("DateTimeOriginal") or exif.get("DateTime")
        if date_str and isinstance(date_str, str):
            try:
                result["taken_at"] = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
            except ValueError:
                pass

        # GPS
        gps_info = exif.get("GPSInfo")
        if gps_info:
            result["gps_lat"] = _convert_gps(gps_info.get(2), gps_info.get(1))
            result["gps_lng"] = _convert_gps(gps_info.get(4), gps_info.get(3))
    except Exception:
        pass

    return result


def _convert_gps(coords, ref) -> float | None:
    """Convert GPS coordinates from EXIF format to decimal degrees."""
    if not coords or not ref:
        return None
    try:
        degrees = float(coords[0])
        minutes = float(coords[1])
        seconds = float(coords[2])
        decimal = degrees + minutes / 60 + seconds / 3600
        if ref in ("S", "W"):
            decimal = -decimal
        return decimal
    except (IndexError, TypeError, ValueError):
        return None


def create_thumbnail(image_data: bytes, max_size: tuple = (400, 400)) -> bytes:
    """Create a thumbnail from image bytes."""
    img = Image.open(BytesIO(image_data))
    img.thumbnail(max_size, Image.LANCZOS)
    buf = BytesIO()
    fmt = "JPEG" if img.mode == "RGB" else "PNG"
    if img.mode == "RGBA":
        fmt = "PNG"
    else:
        img = img.convert("RGB")
        fmt = "JPEG"
    img.save(buf, format=fmt, quality=85)
    return buf.getvalue()


def create_optimized_version(image_data: bytes, max_width: int = 1920) -> bytes:
    """Create an optimized version of the image (resize if needed + WebP conversion).

    Returns WebP bytes. Falls back to original data on any error.
    """
    try:
        img = Image.open(BytesIO(image_data))
        # Resize if wider than max_width while preserving aspect ratio
        if img.width > max_width:
            ratio = max_width / img.width
            new_size = (max_width, int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        # Convert to RGB if needed (WebP supports RGBA but convert for consistency)
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")
        buf = BytesIO()
        img.save(buf, format="WEBP", quality=85)
        return buf.getvalue()
    except Exception as e:
        print(f"[photo_service] create_optimized_version failed: {e}", flush=True)
        return image_data
