from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "TMS Backend"
    API_V1_STR: str = "/api"

    # Seguridad
    # ¡IMPORTANTE! Cambia esto en producción. Para dev está bien.
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 días

    # Base de Datos
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "admin"  # <--- AJUSTA ESTO A TU PASSWORD REAL
    POSTGRES_DB: str = "tms_db"
    POSTGRES_PORT: str = "5432"

    # URL construida automáticamente o leída desde .env
    DATABASE_URL: Optional[str] = None

    def model_post_init(self, __context):
        if not self.DATABASE_URL:
            self.DATABASE_URL = f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",  # Ignora variables extra en el .env
    )


# Instancia global que se importa en otros archivos
settings = Settings()
