import os
import uuid
from fastapi import UploadFile


class StorageService:
    @staticmethod
    def save_file(file: UploadFile, folder: str, prefix: str = "") -> dict:
        upload_base = "app/uploads"
        target_dir = os.path.join(upload_base, folder)

        if not os.path.exists(target_dir):
            os.makedirs(target_dir)

        file_ext = os.path.splitext(file.filename)[1]
        unique_name = f"{prefix}_{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(target_dir, unique_name)

        content = file.file.read()
        file_size = len(content)

        with open(file_path, "wb") as f:
            f.write(content)

        # Regresamos la URL para guardar en DB
        return {
            "url": f"/static/{folder}/{unique_name}",
            "filename": file.filename,
            "size": file_size,
            "mime_type": file.content_type,
        }
