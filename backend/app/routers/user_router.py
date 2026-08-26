from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.postgre_sql.database import get_db
from backend.postgre_sql.tables.users import Users

from backend.app.models.user import User
from backend.app.models.dtos.register_user_dto import RegisterUserDTO
from backend.app.models.roles import Roles
from backend.app.models.dtos.blockchain_transaction_dto import BlockchainTransactionDTO

from backend.app.blockchain.connection import user_contract, w3





user_router = APIRouter(prefix="/user", tags=["User"])



@user_router.get("/{wallet}", response_model=User)
async def get_user(wallet: str, db: Session = Depends(get_db)):
    user = db.query(Users).filter(Users.Wallet == wallet.lower()).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User was not found")


    return User(
        id = user.Id,
        wallet = user.Wallet,
        name = user.Name,
        role = user.Role,
        active = user.Active
    )



@user_router.post("/register")
async def register_user(data: RegisterUserDTO, db: Session = Depends(get_db)):
    try:
        transaction = w3.eth.get_transaction_receipt(data.transaction_hash)
    except Exception:
        raise HTTPException(status_code=400, detail="Transaction not found")

    if transaction["status"] != 1:
        raise HTTPException(status_code=400, detail="Transaction failed")

    if transaction["to"] is None:
        raise HTTPException(status_code=400, detail="Invalid transaction")
    if transaction["to"].lower() != user_contract.address.lower():
        raise HTTPException(status_code=400, detail="Transaction was not sent to UserRegistry")

    events = user_contract.events.UserRegistered().process_receipt(transaction)

    if not events:
        raise HTTPException(status_code=400, detail="UserRegistered event not found")


    event = events[0]["args"]

    wallet = event["wallet"].lower()
    name = event["name"]
    role_value = event["role"]

    if role_value == 1: role = Roles.MERCHANT
    elif role_value == 2: role = Roles.CUSTOMER
    else: raise HTTPException(status_code=400, detail="Invalid user role")

    existing_user = db.query(Users).filter(Users.Wallet == wallet).first()

    if existing_user is not None:
        raise HTTPException(status_code=400, detail="User already exists")


    user = Users(
        Wallet = wallet,
        Name = name,
        Role = role,
        Active = True
    )

    db.add(user)
    db.commit()
    db.refresh(user)


    return User(
        id = user.Id,
        wallet = user.Wallet,
        name = user.Name,
        role = user.Role,
        active = user.Active
    )



@user_router.post("/deactivate")
async def deactivate_user(data: BlockchainTransactionDTO, db: Session = Depends(get_db)):
    try:
        transaction = w3.eth.get_transaction_receipt(data.transaction_hash)
    except Exception:
        raise HTTPException(status_code=400, detail="Transaction not found")

    if transaction["status"] != 1:
        raise HTTPException(status_code=400, detail="Transaction failed")

    if transaction["to"] is None:
        raise HTTPException(status_code=400, detail="Invalid transaction")
    if transaction["to"].lower() != user_contract.address.lower():
        raise HTTPException(status_code=400, detail="Wrong contract")


    events = user_contract.events.UserDeactivated().process_receipt(transaction)

    if not events:
        raise HTTPException(status_code=400, detail="UserDeactivated event not found")


    wallet = events[0]["args"]["wallet"].lower()

    user = db.query(Users).filter(Users.Wallet == wallet).first()

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user.Active = False

    db.commit()


    return {
        "wallet": wallet,
        "active": False,
        "transaction_hash": data.transaction_hash
    }