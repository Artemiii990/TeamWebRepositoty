from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.postgre_sql.database import engine, Base

from backend.postgre_sql.tables.invoices import Invoices
from backend.postgre_sql.tables.users import Users

from backend.app.routers.default_router import default_router
from backend.app.routers.admin_router import admin_router
from backend.app.routers.user_router import user_router





app = FastAPI(title="Crypto Payment Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(default_router)
app.include_router(admin_router)
app.include_router(user_router)


Base.metadata.create_all(bind=engine)