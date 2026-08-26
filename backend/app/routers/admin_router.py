from fastapi import APIRouter, Depends, HTTPException

from backend.app.models.dtos.transfer_admin_dto import TransferAdminDTO
from backend.app.models.dtos.blockchain_transaction_dto import BlockchainTransactionDTO
from backend.app.blockchain.connection import w3, admin_contract, default_contract





admin_router = APIRouter(prefix="/admin", tags=["Admin"])



@admin_router.post("/transferAdmin")
async def transfer_admin(data: TransferAdminDTO):
    try:
        transaction = w3.eth.get_transaction_receipt(data.transaction_hash)
    except Exception:
        raise HTTPException(status_code=400, detail="Transaction not found")

    if transaction["status"] != 1:
        raise HTTPException(status_code=400, detail="Transaction failed")

    if transaction["to"] is None:
        raise HTTPException(status_code=400, detail="Invalid transaction")
    if transaction["to"].lower() != admin_contract.address.lower():
        raise HTTPException(status_code=400, detail="Wrong contract")


    events = admin_contract.events.AdminTransferred().process_receipt(transaction)

    if not events:
        raise HTTPException(status_code=400, detail="AdminTransferred event not found")


    event = events[0]["args"]

    if event["newAdmin"].lower() != data.new_admin.lower():
        raise HTTPException(status_code=400, detail="Wrong new admin")


    return {
        "old_admin": event["oldAdmin"],
        "new_admin": event["newAdmin"],
        "transaction_hash": data.transaction_hash
    }



@admin_router.post("/pause")
async def pause(data: BlockchainTransactionDTO):
    try:
        transaction = w3.eth.get_transaction_receipt(data.transaction_hash)
    except Exception:
        raise HTTPException(status_code=400, detail="Transaction not found")

    if transaction["status"] != 1:
        raise HTTPException(status_code=400, detail="Transaction failed")

    if transaction["to"] is None:
        raise HTTPException(status_code=400, detail="Invalid transaction")
    if transaction["to"].lower() != default_contract.address.lower():
        raise HTTPException(status_code=400, detail="Wrong contract")


    events = default_contract.events.ContractPaused().process_receipt(transaction)

    if not events:
        raise HTTPException(status_code=400, detail="ContractPaused event not found")


    return {
        "paused": True,
        "admin": events[0]["args"]["admin"],
        "transaction_hash": data.transaction_hash
    }



@admin_router.post("/unpause")
async def unpause(data: BlockchainTransactionDTO):
    try:
        transaction = w3.eth.get_transaction_receipt(data.transaction_hash)
    except Exception:
        raise HTTPException(status_code=400, detail="Transaction not found")


    if transaction["status"] != 1:
        raise HTTPException(status_code=400, detail="Transaction failed")

    if transaction["to"] is None:
        raise HTTPException(status_code=400, detail="Invalid transaction")
    if transaction["to"].lower() != default_contract.address.lower():
        raise HTTPException(status_code=400, detail="Wrong contract")


    events = default_contract.events.ContractUnpaused().process_receipt(transaction)

    if not events:
        raise HTTPException(status_code=400,detail="ContractUnpaused event not found")


    return {
        "paused": False,
        "admin": events[0]["args"]["admin"],
        "transaction_hash": data.transaction_hash
    }