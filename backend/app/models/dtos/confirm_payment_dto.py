from web3 import Web3
from fastapi import HTTPException
from pydantic import BaseModel



class ConfirmPaymentDTO(BaseModel):
    transaction_hash: str