from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, contacts, conversations, groups, messages
from app.core.config import settings
from app.db.seed import seed
from app.db.session import Base, SessionLocal, engine
from app.websocket import routes as ws_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="Signal Clone API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(groups.router)
app.include_router(ws_routes.router)


@app.get("/health")
def health():
    return {"status": "ok"}
