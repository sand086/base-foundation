# app/integrations/sat/router.py
from fastapi import APIRouter
from .api_billing import router as billing_router
from .api_catalogs_sat import router as catalogs_sat_router

router = APIRouter()
router.include_router(billing_router)
router.include_router(catalogs_sat_router)
